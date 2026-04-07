import express from 'express';
import pool from '../db.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists natively
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure multer to define where to store the files and what name to give them
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Uses current timestamp to prevent duplicate file names
  }
});
const upload = multer({ storage: storage });

const router = express.Router();

// 1. Get all brands
router.get('/', async (req, res) => {
  try {
    const [brands] = await pool.query('SELECT * FROM brands ORDER BY created_at DESC');
    const brandsWithFullUrl = brands.map(brand => ({
      ...brand,
      avatar: brand.avatar ? `${req.protocol}://${req.get('host')}${brand.avatar}` : null
    }));
    res.json(brandsWithFullUrl);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// 2. Create Brand with Avatar upload
router.post('/', upload.single('avatar'), async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Brand name is required' });

  // req.file contains the uploaded image automatically pulled from form-data
  const avatarPath = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const [result] = await pool.query(
      'INSERT INTO brands (name, description, avatar) VALUES (?, ?, ?)',
      [name, description || null, avatarPath]
    );
    const fullAvatarUrl = avatarPath ? `${req.protocol}://${req.get('host')}${avatarPath}` : null;
    res.status(201).json({ message: 'Brand created successfully', brandId: result.insertId, avatar: fullAvatarUrl });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// 3. Update Brand (Partial updates supported, can also attach new avatar image)
router.put('/:id', upload.single('avatar'), async (req, res) => {
  const brandId = req.params.id;
  const { name, description } = req.body;

  try {
    let updateQuery = 'UPDATE brands SET name = COALESCE(?, name), description = COALESCE(?, description) ';
    let queryParams = [name !== undefined ? name : null, description !== undefined ? description : null];

    // Check if the user uploaded a brand new avatar to replace the old one
    if (req.file) {
      updateQuery += ', avatar = ? ';
      queryParams.push(`/uploads/${req.file.filename}`);
    }

    updateQuery += 'WHERE id = ?';
    queryParams.push(brandId);

    const [result] = await pool.query(updateQuery, queryParams);
    
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Brand not found' });
    
    res.json({ message: 'Brand updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// 4. Delete Brand
router.delete('/:id', async (req, res) => {
  const brandId = req.params.id;
  try {
    const [result] = await pool.query('DELETE FROM brands WHERE id = ?', [brandId]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Brand not found' });

    res.json({ message: 'Brand deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
