import express from 'express';
import pool from '../db.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

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

// 1. Search products (by ID or Slug or Name)
router.get('/search', async (req, res) => {
  const { q } = req.query;
  try {
    const [products] = await pool.query(`
      SELECT p.*, c.name as category_name, b.name as brand_name 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN brands b ON p.brand_id = b.id
      WHERE p.name LIKE ? OR p.slug = ? OR p.id = ?
    `, [`%${q}%`, q, q]);

    const result = products.map(p => {
      const priceInfo = calculatePrice(p.original_price, p.promo_price, p.promo_start, p.promo_end);
      return { ...p, thumbnail: p.thumbnail, ...priceInfo };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Get Product Detail by ID or Slug
router.get('/detail/:identifier', async (req, res) => {
  const { identifier } = req.params;
  try {
    // Determine if identifier is ID (numeric) or Slug (string)
    const query = isNaN(identifier) 
      ? 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.slug = ?'
      : 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?';

    const [products] = await pool.query(query, [identifier]);
    if (products.length === 0) return res.status(404).json({ message: 'Product not found' });

    const p = products[0];
    const priceInfo = calculatePrice(p.original_price, p.promo_price, p.promo_start, p.promo_end);

    // Fetch variants and gallery for full detail
    const [variants] = await pool.query('SELECT * FROM product_variants WHERE product_id = ?', [p.id]);
    const [gallery] = await pool.query('SELECT * FROM product_images WHERE product_id = ?', [p.id]);

    res.json({
      ...p,
      thumbnail: p.thumbnail,
      ...priceInfo,
      variants: variants.map(v => ({ ...v, variant_image: v.variant_image })),
      gallery: gallery.map(img => ({ ...img, image_url: img.image_url }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all products
router.get('/', async (req, res) => {
  try {
    const [products] = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    const result = products.map(p => {
      const priceInfo = calculatePrice(p.original_price, p.promo_price, p.promo_start, p.promo_end);
      return { ...p, thumbnail: p.thumbnail, ...priceInfo };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create product
router.post('/', upload.single('thumbnail'), async (req, res) => {
  const { category_id, subcategory_id, brand_id, name, description, original_price, promo_price, promo_start, promo_end, status } = req.body;
  const thumbnail = req.file ? req.file.path : null;
  const slug = slugify(name) + '-' + Date.now().toString().slice(-4); // Ensure unique slug

  try {
    const [result] = await pool.query(
      `INSERT INTO products (category_id, subcategory_id, brand_id, name, slug, description, original_price, promo_price, promo_start, promo_end, thumbnail, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [category_id || null, subcategory_id || null, brand_id || null, name, slug, description, original_price || 0, promo_price || null, promo_start || null, promo_end || null, thumbnail, status || 'active']
    );
    res.status(201).json({ id: result.insertId, slug, message: 'Product created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update product
router.put('/:id', upload.single('thumbnail'), async (req, res) => {
  const { id } = req.params;
  const body = req.body;
  const thumbnail = req.file ? req.file.path : undefined;

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

    if (body.name) {
      query += `slug = ?, `;
      params.push(slugify(body.name) + '-' + id); // Update slug on name change
    }

    if (thumbnail !== undefined) {
      query += `thumbnail = ?, `;
      params.push(thumbnail);
    }

    query = query.slice(0, -2);
    query += ' WHERE id = ?';
    params.push(id);

    await pool.query(query, params);
    res.json({ message: 'Product updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/** --- OTHER CRUDs (VARIANTS, GALLERY) --- **/

// Get variants
router.get('/:productId/variants', async (req, res) => {
  try {
    const [variants] = await pool.query('SELECT * FROM product_variants WHERE product_id = ?', [req.params.productId]);
    res.json(variants.map(v => ({...v, variant_image: v.variant_image})));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:productId/variants', upload.single('variant_image'), async (req, res) => {
  const { productId } = req.params;
  const { color, size, sku, stock, original_price, promo_price, promo_start, promo_end } = req.body;
  const img = req.file ? req.file.path : null;
  try {
    await pool.query('INSERT INTO product_variants (product_id, color, size, sku, stock, original_price, promo_price, promo_start, promo_end, variant_image) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [productId, color, size, sku, stock, original_price, promo_price, promo_start, promo_end, img]);
    res.status(201).json({ message: 'Variant added' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:productId/gallery', upload.array('images', 5), async (req, res) => {
  const { productId } = req.params;
  try {
    const promises = req.files.map(f => pool.query('INSERT INTO product_images (product_id, image_url) VALUES (?, ?)', [productId, f.path]));
    await Promise.all(promises);
    res.status(201).json({ message: 'Gallery updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:productId/gallery', async (req, res) => {
  try {
    const [ims] = await pool.query('SELECT * FROM product_images WHERE product_id = ?', [req.params.productId]);
    res.json(ims.map(i => ({...i, image_url: i.image_url})));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
