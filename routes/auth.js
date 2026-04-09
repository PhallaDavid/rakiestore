import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../db.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = express.Router();

// 1. Register with Phone and Name
router.post('/register', async (req, res) => {
  const { phone, password, name } = req.body;
  if (!phone || !password || !name) {
    return res.status(400).json({ message: 'Name, phone, and password are required' });
  }

  try {
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE phone = ?', [phone]);
    if (existingUsers.length > 0) return res.status(400).json({ message: 'Phone number already registered' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await pool.query('INSERT INTO users (name, phone, password) VALUES (?, ?, ?)', [name, phone, hashedPassword]);

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// 2. Login with Phone
router.post('/login', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ message: 'Phone and password are required' });

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE phone = ?', [phone]);
    if (users.length === 0) return res.status(400).json({ message: 'Invalid credentials' });

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const payload = { id: user.id, phone: user.phone, name: user.name };
    const secret = process.env.JWT_SECRET || 'your_secret_key';
    
    jwt.sign(payload, secret, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({ token, user: payload });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// 2.1 Google Login
router.post('/google-login', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ message: 'Google ID Token is required' });

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: google_id, email, name, picture: avatar } = payload;

    // Check if user exists by google_id or email
    let [users] = await pool.query('SELECT * FROM users WHERE google_id = ? OR email = ?', [google_id, email]);
    
    let user;
    if (users.length === 0) {
      // Create new user
      const [result] = await pool.query(
        'INSERT INTO users (name, email, google_id, avatar) VALUES (?, ?, ?, ?)',
        [name, email, google_id, avatar]
      );
      const [newUserData] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
      user = newUserData[0];
    } else {
      user = users[0];
      // Update google_id if it was null (found by email)
      if (!user.google_id) {
        await pool.query('UPDATE users SET google_id = ? WHERE id = ?', [google_id, user.id]);
        user.google_id = google_id;
      }
    }

    const jwtPayload = { id: user.id, email: user.email, name: user.name };
    const secret = process.env.JWT_SECRET || 'your_secret_key';
    
    jwt.sign(jwtPayload, secret, { expiresIn: '7d' }, (err, token) => {
      if (err) throw err;
      res.json({ 
        token, 
        user: { 
          id: user.id, 
          name: user.name, 
          email: user.email, 
          phone: user.phone,
          avatar: user.avatar 
        } 
      });
    });
  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(401).json({ message: 'Invalid Google Token' });
  }
});

// 3. Get Profile (Protected)
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, phone, name, avatar, gender, address, age, created_at FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) return res.status(404).json({ message: 'User not found' });
    
    res.json({ profile: users[0] });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});
router.post('/update-profile', verifyToken, async (req, res) => {
  const { name, avatar, gender, address, age } = req.body;
  
  try {
    const updateQuery = `
      UPDATE users 
      SET name = COALESCE(?, name), 
          avatar = COALESCE(?, avatar), 
          gender = COALESCE(?, gender), 
          address = COALESCE(?, address), 
          age = COALESCE(?, age)
      WHERE id = ?
    `;
    
    await pool.query(updateQuery, [
      name !== undefined ? name : null, 
      avatar !== undefined ? avatar : null, 
      gender !== undefined ? gender : null, 
      address !== undefined ? address : null, 
      age !== undefined ? age : null, 
      req.user.id
    ]);
    
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});
router.post('/change-password', verifyToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) return res.status(400).json({ message: 'Old and new passwords are required' });

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const user = users[0];

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Incorrect old password' });

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, req.user.id]);
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// 5. Forgot Password (Mocked without SMS)
router.post('/forgot-password', async (req, res) => {
  const { phone, newPassword } = req.body;
  
  // NOTE: In a real app, you would send an SMS OTP here. 
  // For this API, we will just allow resetting it directly using the phone number.
  if (!phone || !newPassword) return res.status(400).json({ message: 'Phone and new password are required' });

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE phone = ?', [phone]);
    if (users.length === 0) return res.status(404).json({ message: 'User with this phone number not found' });

    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    await pool.query('UPDATE users SET password = ? WHERE phone = ?', [hashedNewPassword, phone]);
    res.json({ message: 'Password reset successfully. You can now login with your new password.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
