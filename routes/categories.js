import express from 'express';
import pool from '../db.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

// --- CATEGORY CRUD ---

// Get all categories with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;

    // Get total count
    const [countRows] = await pool.query('SELECT COUNT(*) as total FROM categories');
    const totalItems = countRows[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    // Get paginated data
    const [categories] = await pool.query(
      'SELECT * FROM categories ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset]
    );

    res.json({
      data: categories,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Category
router.post('/', upload.single('avatar'), async (req, res) => {
  const { name, description } = req.body;
  const avatar = req.file ? req.file.path : null;
  try {
    const [result] = await pool.query(
      'INSERT INTO categories (name, description, avatar) VALUES (?, ?, ?)',
      [name, description, avatar]
    );
    res.status(201).json({ id: result.insertId, name, description, avatar });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Category
router.put('/:id', upload.single('avatar'), async (req, res) => {
  const { name, description } = req.body;
  const { id } = req.params;
  const avatar = req.file ? req.file.path : undefined;

  try {
    let query = 'UPDATE categories SET name = COALESCE(?, name), description = COALESCE(?, description)';
    let params = [name || null, description || null];

    if (avatar !== undefined) {
      query += ', avatar = ?';
      params.push(avatar);
    }
    query += ' WHERE id = ?';
    params.push(id);

    await pool.query(query, params);
    res.json({ message: 'Category updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Category
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SUBCATEGORY CRUD ---

// Get subcategories by category
router.get('/:categoryId/subcategories', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM subcategories WHERE category_id = ?', [req.params.categoryId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Subcategory
router.post('/:categoryId/subcategories', upload.single('avatar'), async (req, res) => {
  const { categoryId } = req.params;
  const { name, description } = req.body;
  const avatar = req.file ? req.file.path : null;
  try {
    const [result] = await pool.query(
      'INSERT INTO subcategories (category_id, name, description, avatar) VALUES (?, ?, ?, ?)',
      [categoryId, name, description, avatar]
    );
    res.status(201).json({ id: result.insertId, category_id: categoryId, name, description, avatar });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Subcategory
router.put('/subcategories/:id', upload.single('avatar'), async (req, res) => {
  const { name, description } = req.body;
  const { id } = req.params;
  const avatar = req.file ? req.file.path : undefined;

  try {
    let query = 'UPDATE subcategories SET name = COALESCE(?, name), description = COALESCE(?, description)';
    let params = [name || null, description || null];

    if (avatar !== undefined) {
      query += ', avatar = ?';
      params.push(avatar);
    }
    query += ' WHERE id = ?';
    params.push(id);

    await pool.query(query, params);
    res.json({ message: 'Subcategory updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Subcategory
router.delete('/subcategories/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM subcategories WHERE id = ?', [req.params.id]);
    res.json({ message: 'Subcategory deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;