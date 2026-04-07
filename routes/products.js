import express from 'express';
import pool from '../db.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage: storage });

const router = express.Router();

const getFullUrl = (req, relativePath) => {
  if (!relativePath) return null;
  return `${req.protocol}://${req.get('host')}${relativePath}`;
};

// Function to calculate final price based on promotion dates
const calculatePrice = (original, promo, start, end) => {
  const now = new Date();
  const startTime = start ? new Date(start) : null;
  const endTime = end ? new Date(end) : null;

  if (promo && startTime && endTime && now >= startTime && now <= endTime) {
    return {
      current_price: parseFloat(promo),
      is_on_sale: true
    };
  }
  return {
    current_price: parseFloat(original),
    is_on_sale: false
  };
};

/** --- PRODUCT CRUD --- **/

// Get all products with calculated sale prices
router.get('/', async (req, res) => {
  try {
    const [products] = await pool.query(`
      SELECT p.*, c.name as category_name, b.name as brand_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      ORDER BY p.created_at DESC
    `);

    const result = products.map(p => {
      const priceInfo = calculatePrice(p.original_price, p.promo_price, p.promo_start, p.promo_end);
      return {
        ...p,
        thumbnail: getFullUrl(req, p.thumbnail),
        ...priceInfo
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create product (Form-Data)
router.post('/', upload.single('thumbnail'), async (req, res) => {
  const { category_id, subcategory_id, brand_id, name, description, original_price, promo_price, promo_start, promo_end, status } = req.body;
  const thumbnail = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const [result] = await pool.query(
      `INSERT INTO products (category_id, subcategory_id, brand_id, name, description, original_price, promo_price, promo_start, promo_end, thumbnail, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [category_id || null, subcategory_id || null, brand_id || null, name, description, original_price || 0, promo_price || null, promo_start || null, promo_end || null, thumbnail, status || 'active']
    );
    res.status(201).json({ id: result.insertId, message: 'Product created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update product
router.put('/:id', upload.single('thumbnail'), async (req, res) => {
  const { id } = req.params;
  const body = req.body;
  const thumbnail = req.file ? `/uploads/${req.file.filename}` : undefined;

  try {
    let query = 'UPDATE products SET ';
    let params = [];
    const fields = ['category_id', 'subcategory_id', 'brand_id', 'name', 'description', 'original_price', 'promo_price', 'promo_start', 'promo_end', 'status'];
    
    fields.forEach(field => {
      if (body[field] !== undefined) {
        query += `${field} = ?, `;
        params.push(body[field] === '' ? null : body[field]);
      }
    });

    if (thumbnail !== undefined) {
      query += `thumbnail = ?, `;
      params.push(thumbnail);
    }

    query = query.slice(0, -2); // Remove last comma
    query += ' WHERE id = ?';
    params.push(id);

    await pool.query(query, params);
    res.json({ message: 'Product updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Product
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/** --- VARIANT CRUD --- **/

// Get variants for a product
router.get('/:productId/variants', async (req, res) => {
  try {
    const [variants] = await pool.query('SELECT * FROM product_variants WHERE product_id = ?', [req.params.productId]);
    const result = variants.map(v => {
      const priceInfo = calculatePrice(v.original_price, v.promo_price, v.promo_start, v.promo_end);
      return {
        ...v,
        variant_image: getFullUrl(req, v.variant_image),
        ...priceInfo
      };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add Variant
router.post('/:productId/variants', upload.single('variant_image'), async (req, res) => {
  const { productId } = req.params;
  const { color, size, sku, stock, original_price, promo_price, promo_start, promo_end } = req.body;
  const variant_image = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const [result] = await pool.query(
      `INSERT INTO product_variants (product_id, color, size, sku, stock, original_price, promo_price, promo_start, promo_end, variant_image) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [productId, color, size, sku, stock || 0, original_price || null, promo_price || null, promo_start || null, promo_end || null, variant_image]
    );
    res.status(201).json({ id: result.insertId, message: 'Variant added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/** --- GALLERY CRUD --- **/

// Add multiple images to product gallery
router.post('/:productId/gallery', upload.array('images', 5), async (req, res) => {
  const { productId } = req.params;
  const files = req.files;

  try {
    const insertPromises = files.map(file => {
      return pool.query('INSERT INTO product_images (product_id, image_url) VALUES (?, ?)', [productId, `/uploads/${file.filename}`]);
    });
    await Promise.all(insertPromises);
    res.status(201).json({ message: `${files.length} images added to gallery` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get gallery images
router.get('/:productId/gallery', async (req, res) => {
  try {
    const [images] = await pool.query('SELECT * FROM product_images WHERE product_id = ?', [req.params.productId]);
    const result = images.map(img => ({ ...img, image_url: getFullUrl(req, img.image_url) }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
