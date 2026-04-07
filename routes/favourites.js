import express from 'express';
import pool from '../db.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

const getFullUrl = (req, relativePath) => {
  if (!relativePath) return null;
  return `${req.protocol}://${req.get('host')}${relativePath}`;
};

/** --- FAVORITES / WISHLIST CRUD (Authenticated) --- **/

// 1. Get my favorites
router.get('/', verifyToken, async (req, res) => {
  try {
    const [favs] = await pool.query(`
      SELECT f.id as favorite_id, f.created_at as favorited_at, p.*, c.name as category_name
      FROM favorites f
      JOIN products p ON f.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE f.user_id = ?
    `, [req.user.id]);

    const result = favs.map(p => ({...p, thumbnail: getFullUrl(req, p.thumbnail)}));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Add to Favorites
router.post('/add', verifyToken, async (req, res) => {
  const { product_id } = req.body;
  if (!product_id) return res.status(400).json({ message: 'Product ID is required' });

  try {
    // Check if product exists
    const [prods] = await pool.query('SELECT * FROM products WHERE id = ?', [product_id]);
    if (prods.length === 0) return res.status(404).json({ message: 'Product not found' });

    // Use ignore or error catching for UNIQUE constraint
    await pool.query('INSERT IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)', [req.user.id, product_id]);
    res.status(201).json({ message: 'Product added to favorites' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Remove from Favorites
router.delete('/:productId', verifyToken, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM favorites WHERE product_id = ? AND user_id = ?', [req.params.productId, req.user.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Favorite not found' });
    
    res.json({ message: 'Removed from favorites' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
