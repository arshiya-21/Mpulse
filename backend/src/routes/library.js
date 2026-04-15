const express    = require('express');
const router     = express.Router();
const db         = require('../config/db');
const { verify } = require('../middleware/auth');

// ── Sections ──────────────────────────────────────────────────

// GET all sections with video count
router.get('/sections', verify, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT ls.*, COUNT(lv.id) AS video_count
      FROM library_sections ls
      LEFT JOIN library_videos lv ON lv.section_id = ls.id
      GROUP BY ls.id
      ORDER BY ls.sort_order, ls.title
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /library/sections error:', err);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

// POST create section
router.post('/sections', verify, async (req, res) => {
  try {
    const { title, description, sort_order } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const { rows } = await db.query(`
      INSERT INTO library_sections (title, description, sort_order)
      VALUES ($1,$2,$3) RETURNING *
    `, [title, description||null, sort_order||0]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /library/sections error:', err);
    res.status(500).json({ error: 'Failed to create section' });
  }
});

// PUT update section
router.put('/sections/:id', verify, async (req, res) => {
  try {
    const { title, description, sort_order } = req.body;
    const { rows } = await db.query(`
      UPDATE library_sections SET title=$1, description=$2, sort_order=$3, updated_at=NOW()
      WHERE id=$4 RETURNING *
    `, [title, description||null, sort_order||0, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Section not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /library/sections/:id error:', err);
    res.status(500).json({ error: 'Failed to update section' });
  }
});

// DELETE section
router.delete('/sections/:id', verify, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM library_sections WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Section not found' });
    res.json({ message: 'Section deleted' });
  } catch (err) {
    console.error('DELETE /library/sections/:id error:', err);
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

// ── Videos ────────────────────────────────────────────────────

// GET videos for a section
router.get('/sections/:sectionId/videos', verify, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM library_videos WHERE section_id=$1 ORDER BY sort_order, title',
      [req.params.sectionId]
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /library/sections/:id/videos error:', err);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// GET all videos
router.get('/videos', verify, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT lv.*, ls.title AS section_title
      FROM library_videos lv
      LEFT JOIN library_sections ls ON lv.section_id = ls.id
      ORDER BY ls.sort_order, lv.sort_order, lv.title
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /library/videos error:', err);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// POST create video
router.post('/videos', verify, async (req, res) => {
  try {
    const { section_id, title, description, youtube_url, duration, sort_order } = req.body;
    if (!title || !youtube_url) return res.status(400).json({ error: 'Title and YouTube URL are required' });
    const { rows } = await db.query(`
      INSERT INTO library_videos (section_id, title, description, youtube_url, duration, sort_order)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
    `, [section_id||null, title, description||null, youtube_url, duration||null, sort_order||0]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /library/videos error:', err);
    res.status(500).json({ error: 'Failed to create video' });
  }
});

// PUT update video
router.put('/videos/:id', verify, async (req, res) => {
  try {
    const { section_id, title, description, youtube_url, duration, sort_order } = req.body;
    const { rows } = await db.query(`
      UPDATE library_videos SET section_id=$1, title=$2, description=$3,
        youtube_url=$4, duration=$5, sort_order=$6, updated_at=NOW()
      WHERE id=$7 RETURNING *
    `, [section_id||null, title, description||null, youtube_url, duration||null, sort_order||0, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Video not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /library/videos/:id error:', err);
    res.status(500).json({ error: 'Failed to update video' });
  }
});

// DELETE video
router.delete('/videos/:id', verify, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM library_videos WHERE id=$1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Video not found' });
    res.json({ message: 'Video deleted' });
  } catch (err) {
    console.error('DELETE /library/videos/:id error:', err);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

module.exports = router;
