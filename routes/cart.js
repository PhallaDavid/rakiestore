import express from 'express';
import pool from '../db.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

const getFullUrl = (req, relativePath) => {
  if (!relativePath) return null;
  return `${req.protocol}://${req.get('host')}${relativePath}`;
};

/** --- CART CRUD (Authenticated) --- **/

// 1. Get my cart items
router.get('/', verifyToken, async (req, res) => {
  try {
    const [cart] = await pool.query(`
      SELECT c.*, v.product_id, v.color, v.size, v.sku, v.original_price, v.promo_price, v.promo_start, v.promo_end, p.name, p.thumbnail
      FROM cart_items c
      JOIN product_variants v ON c.variant_id = v.id
      JOIN products p ON v.product_id = p.id
      WHERE c.user_id = ?
    `, [req.user.id]);

    // Map to include full URLs
    const result = cart.map(item => ({...item, thumbnail: getFullUrl(req, item.thumbnail)}));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Add to Cart (Requires variant_id and quantity)
router.post('/add', verifyToken, async (req, res) => {
  const { variant_id, quantity } = req.body;
  const qty = quantity || 1;

  try {
    // Check if variant exists
    const [variants] = await pool.query('SELECT * FROM product_variants WHERE id = ?', [variant_id]);
    if (variants.length === 0) return res.status(404).json({ message: 'Product variant not found' });

    // Check if already in cart
    const [existing] = await pool.query('SELECT * FROM cart_items WHERE user_id = ? AND variant_id = ?', [req.user.id, variant_id]);
    
    if (existing.length > 0) {
      // Update quantity if exists
      await pool.query('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?', [qty, existing[0].id]);
      res.json({ message: 'Cart updated' });
    } else {
      // Insert new
      await pool.query('INSERT INTO cart_items (user_id, variant_id, quantity) VALUES (?, ?, ?)', [req.user.id, variant_id, qty]);
      res.status(201).json({ message: 'Added to cart' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Remove from Cart
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM cart_items WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Cart item not found or not yours' });
    
    res.json({ message: 'Removed from cart' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Update Cart Quantity
router.put('/:id', verifyToken, async (req, res) => {
  const { quantity } = req.body;
  try {
    await pool.query('UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?', [quantity, req.params.id, req.user.id]);
    res.json({ message: 'Quantity updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
