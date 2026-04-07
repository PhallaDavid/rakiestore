import express from 'express';
import pool from '../db.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

const calculatePrice = (original, promo, start, end) => {
  const now = new Date();
  const startTime = start ? new Date(start) : null;
  const endTime = end ? new Date(end) : null;
  if (promo && startTime && endTime && now >= startTime && now <= endTime) {
    return parseFloat(promo);
  }
  return parseFloat(original);
};

/** --- ORDER & CHECKOUT CRUD (Authenticated) --- **/

// 1. Checkout (Convert Cart to Order)
router.post('/checkout', verifyToken, async (req, res) => {
  const { address, payment_method, phone, note } = req.body;

  if (!address || !payment_method) {
    return res.status(400).json({ message: 'Address and payment method are required' });
  }

  const connection = await pool.getConnection(); // Use transaction for multi-table safety
  try {
    await connection.beginTransaction();

    // 1. Get user cart items
    const [cartItems] = await connection.query(`
      SELECT c.*, v.original_price, v.promo_price, v.promo_start, v.promo_end, p.original_price as p_orig, p.promo_price as p_promo, p.promo_start as p_start, p.promo_end as p_end
      FROM cart_items c
      JOIN product_variants v ON c.variant_id = v.id
      JOIN products p ON v.product_id = p.id
      WHERE c.user_id = ?
    `, [req.user.id]);

    if (cartItems.length === 0) {
      return res.status(400).json({ message: 'Your cart is empty' });
    }

    // 2. Calculate total and prepare order items
    let totalPrice = 0;
    const orderItemsToInsert = cartItems.map(item => {
      // Logic: If variant has its own price, use that. Otherwise use product base price.
      const orig = item.original_price || item.p_orig;
      const promo = item.promo_price || item.p_promo;
      const start = item.promo_start || item.p_start;
      const end = item.promo_end || item.p_end;

      const price = calculatePrice(orig, promo, start, end);
      totalPrice += price * item.quantity;

      return [null, null, item.variant_id, item.quantity, price]; // [item_id, order_id, variant_id, qty, price]
    });

    // 3. Create the Order
    const [orderResult] = await connection.query(
      'INSERT INTO orders (user_id, total_price, address, payment_method, phone, note) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, totalPrice, address, payment_method, phone || null, note || null]
    );
    const orderId = orderResult.insertId;

    // 4. Fill Order Items
    const finalOrderItems = orderItemsToInsert.map(item => {
        item[1] = orderId; // Fill order_id
        return item.slice(1); // remove the null id
    });
    
    await connection.query('INSERT INTO order_items (order_id, variant_id, quantity, price_at_purchase) VALUES ?', [finalOrderItems]);

    // 5. Clear Cart
    await connection.query('DELETE FROM cart_items WHERE user_id = ?', [req.user.id]);

    await connection.commit();
    res.status(201).json({ message: 'Order placed successfully', order_id: orderId, total: totalPrice });

  } catch (err) {
    await connection.rollback();
    console.error(err.message);
    res.status(500).json({ error: err.message });
  } finally {
    connection.release();
  }
});

// 2. Get my orders
router.get('/', verifyToken, async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Get Order Detail
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const [orders] = await pool.query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    if (orders.length === 0) return res.status(404).json({ message: 'Order not found' });

    const [items] = await pool.query(`
      SELECT oi.*, v.color, v.size, p.name, p.thumbnail
      FROM order_items oi
      JOIN product_variants v ON oi.variant_id = v.id
      JOIN products p ON v.product_id = p.id
      WHERE oi.order_id = ?
    `, [req.params.id]);

    res.json({ order: orders[0], items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
