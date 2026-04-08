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
      SELECT 
        c.*, 
        p.name, 
        p.thumbnail,
        v.color, 
        v.size, 
        v.sku, 
        COALESCE(v.original_price, p.original_price) as original_price,
        COALESCE(v.promo_price, p.promo_price) as promo_price,
        COALESCE(v.promo_start, p.promo_start) as promo_start,
        COALESCE(v.promo_end, p.promo_end) as promo_end
      FROM cart_items c
      JOIN products p ON c.product_id = p.id
      LEFT JOIN product_variants v ON c.variant_id = v.id
      WHERE c.user_id = ?
    `, [req.user.id]);

    // Map to include full URLs
    const result = cart.map(item => ({...item, thumbnail: getFullUrl(req, item.thumbnail)}));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Add to Cart (Requires product_id, optional variant_id and quantity)
router.post('/add', verifyToken, async (req, res) => {
  const { product_id, variant_id, quantity } = req.body;
  const qty = quantity || 1;

  if (!product_id) return res.status(400).json({ message: 'product_id is required' });

  try {
    // Check if product exists
    const [products] = await pool.query('SELECT * FROM products WHERE id = ?', [product_id]);
    if (products.length === 0) return res.status(404).json({ message: 'Product not found' });

    // If variant is provided, check if it exists and belongs to the product
    if (variant_id) {
      const [variants] = await pool.query('SELECT * FROM product_variants WHERE id = ? AND product_id = ?', [variant_id, product_id]);
      if (variants.length === 0) return res.status(404).json({ message: 'Product variant not found' });
    }

    // Check if already in cart (match both product_id and variant_id)
    const [existing] = await pool.query(
      'SELECT * FROM cart_items WHERE user_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))',
      [req.user.id, product_id, variant_id, variant_id]
    );
    
    if (existing.length > 0) {
      // Update quantity if exists
      await pool.query('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?', [qty, existing[0].id]);
      res.json({ message: 'Cart updated' });
    } else {
      // Insert new
      await pool.query(
        'INSERT INTO cart_items (user_id, product_id, variant_id, quantity) VALUES (?, ?, ?, ?)',
        [req.user.id, product_id, variant_id || null, qty]
      );
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
