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

// GET /posters with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;
    const status = normalizeStatus(req.query.status);

    if (req.query.status !== undefined && status === null) {
      return res.status(400).json({ message: "Invalid status. Use 'active' or 'inactive'." });
    }

    // Get total count
    let countSql = 'SELECT COUNT(*) as total FROM posters';
    let countParams = [];
    if (status) {
      countSql += ' WHERE status = ?';
      countParams.push(status);
    }
    const [countRows] = await pool.query(countSql, countParams);
    const totalItems = countRows[0].total;
    const totalPages = Math.ceil(totalItems / limit);

    // Get paginated data
    let sql = 'SELECT * FROM posters';
    let params = [];
    if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [posters] = await pool.query(sql, params);
    
    res.json({
      data: posters.map(p => ({ ...p, image: p.image })),
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        itemsPerPage: limit
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET /posters/:id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM posters WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Poster not found' });
    const p = rows[0];
    res.json({ ...p, image: p.image });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// POST /posters (multipart/form-data: image, title, description, status)
router.post('/', upload.single('image'), async (req, res) => {
  const { title, description } = req.body;
  const status = normalizeStatus(req.body.status) ?? 'active';

  if (!title) return res.status(400).json({ message: 'Poster title is required' });
  if (status === null) return res.status(400).json({ message: "Invalid status. Use 'active' or 'inactive'." });

  const imagePath = req.file ? req.file.path : null;

  try {
    const [result] = await pool.query(
      'INSERT INTO posters (title, description, image, status) VALUES (?, ?, ?, ?)',
      [title, description || null, imagePath, status]
    );

    res.status(201).json({
      message: 'Poster created successfully',
      posterId: result.insertId,
      image: imagePath
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// PUT /posters/:id (multipart/form-data supported)
router.put('/:id', upload.single('image'), async (req, res) => {
  const posterId = req.params.id;
  const { title, description } = req.body;
  const status = normalizeStatus(req.body.status);

  if (req.body.status !== undefined && status === null) {
    return res.status(400).json({ message: "Invalid status. Use 'active' or 'inactive'." });
  }

  try {
    let updateQuery =
      'UPDATE posters SET title = COALESCE(?, title), description = COALESCE(?, description), status = COALESCE(?, status)';
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
    queryParams.push(posterId);

    const [result] = await pool.query(updateQuery, queryParams);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Poster not found' });

    res.json({ message: 'Poster updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

// DELETE /posters/:id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM posters WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Poster not found' });
    res.json({ message: 'Poster deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server Error' });
  }
});

export default router;
