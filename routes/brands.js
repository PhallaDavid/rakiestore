import express from 'express';
import pool from '../db.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

// 1. Get all brands
router.get('/', async (req, res) => {
  try {
    const [brands] = await pool.query('SELECT * FROM brands ORDER BY created_at DESC');
    res.json(brands);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// 2. Create Brand with Avatar upload
router.post('/', upload.single('avatar'), async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Brand name is required' });

  const avatarUrl = req.file ? req.file.path : null;

  try {
    const [result] = await pool.query(
      'INSERT INTO brands (name, description, avatar) VALUES (?, ?, ?)',
      [name, description || null, avatarUrl]
    );
    res.status(201).json({ message: 'Brand created successfully', brandId: result.insertId, avatar: avatarUrl });
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

    if (req.file) {
      updateQuery += ', avatar = ? ';
      queryParams.push(req.file.path);
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