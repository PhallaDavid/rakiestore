import express from 'express';
import dotenv from 'dotenv';
import pool from './db.js';
import authRoute from './routes/auth.js';
import brandsRoute from './routes/brands.js';
import categoryRoute from './routes/categories.js';

dotenv.config();
const app = express();
app.use(express.json());

// Public static folder for uploaded image avatars
app.use('/uploads', express.static('uploads'));

// API routes
app.use('/auth', authRoute);
app.use('/brands', brandsRoute);
app.use('/categories', categoryRoute);
app.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT NOW() AS now');
    res.json(rows);
  } catch (err) {
    console.error('DB Connection Error:', err.message);
    res.status(500).json({ error: 'Failed to connect to the Database!' });
  }
});

// Test API to show a message
app.get('/test', (req, res) => {
  res.json({ message: 'Hello, dsadthis is a test message!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));