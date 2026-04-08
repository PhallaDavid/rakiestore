import express from 'express';
import pool from '../db.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

const normalizeStatus = (value) => {
  if (value === undefined) return undefined;
  const s = String(value).toLowerCase().trim();
  if (s === 'active' || s === 'inactive') return s;
  return null;
};

// GET /banners?status=active|inactive
router.get('/', async (req, res) => {
  try {
    const status = normalizeStatus(req.query.status);
    if (req.query.status !== undefined && status === null) {
      return res.status(400).json({ message: "Invalid status. Use 'active' or 'inactive'." });
    }

    const sql = status
      ? 'SELECT * FROM banners WHERE status = ? ORDER BY created_at DESC'
      : 'SELECT * FROM banners ORDER BY created_at DESC';
    const params = status ? [status] : [];

    const [banners] = await pool.query(sql, params);
    res.json(banners.map(b => ({ ...b, image: b.image })));
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET /banners/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM banners WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Banner not found' });
    const b = rows[0];
    res.json({ ...b, image: b.image });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// POST /banners (multipart/form-data: image, title, description, status)
router.post('/', upload.single('image'), async (req, res) => {
  const { title, description } = req.body;
  const status = normalizeStatus(req.body.status) ?? 'active';

  if (!title) return res.status(400).json({ message: 'Banner title is required' });
  if (status === null) return res.status(400).json({ message: "Invalid status. Use 'active' or 'inactive'." });

  const imagePath = req.file ? req.file.path : null;

  try {
    const [result] = await pool.query(
      'INSERT INTO banners (title, description, image, status) VALUES (?, ?, ?, ?)',
      [title, description || null, imagePath, status]
    );

    res.status(201).json({
      message: 'Banner created successfully',
      bannerId: result.insertId,
      image: imagePath
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// PUT /banners/:id (multipart/form-data supported)
router.put('/:id', upload.single('image'), async (req, res) => {
  const bannerId = req.params.id;
  const { title, description } = req.body;
  const status = normalizeStatus(req.body.status);

  if (req.body.status !== undefined && status === null) {
    return res.status(400).json({ message: "Invalid status. Use 'active' or 'inactive'." });
  }

  try {
    let updateQuery =
      'UPDATE banners SET title = COALESCE(?, title), description = COALESCE(?, description), status = COALESCE(?, status)';
    const queryParams = [
      title !== undefined ? title : null,
      description !== undefined ? description : null,
      status !== undefined ? status : null
    ];

    if (req.file) {
      updateQuery += ', image = ?';
      queryParams.push(req.file.path);
    }

    updateQuery += ' WHERE id = ?';
    queryParams.push(bannerId);

    const [result] = await pool.query(updateQuery, queryParams);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Banner not found' });

    res.json({ message: 'Banner updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// DELETE /banners/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM banners WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Banner not found' });
    res.json({ message: 'Banner deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;