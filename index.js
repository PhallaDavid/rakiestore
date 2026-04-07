import express from 'express';
import dotenv from 'dotenv';
import pool from './db.js';
import authRoute from './routes/auth.js';
import brandsRoute from './routes/brands.js';
import categoryRoute from './routes/categories.js';
import productRoute from './routes/products.js';
import cartRoute from './routes/cart.js';
import favRoute from './routes/favourites.js';
import orderRoute from './routes/orders.js';
import cors from './middleware/cors.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Public static folder for uploaded image avatars
app.use('/uploads', express.static('uploads'));

// API routes
app.use('/auth', authRoute);
app.use('/brands', brandsRoute);
app.use('/categories', categoryRoute);
app.use('/products', productRoute);
app.use('/cart', cartRoute);
app.use('/favorites', favRoute);
app.use('/orders', orderRoute);
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
