const express    = require('express');
const router     = express.Router();
const db         = require('../config/db');
const { verify } = require('../middleware/auth');

// GET all sections with video count
router.get('/sections', verify, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT ls.id, ls.title, ls.sort_order, COUNT(lv.id)::int AS video_count
      FROM library_sections ls
      LEFT JOIN library_videos lv ON lv.section_id = ls.id
      GROUP BY ls.id ORDER BY ls.sort_order, ls.title
    `);
    res.json(rows);
  } catch (err) {
    console.error('GET /library/sections:', err);
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

// POST create section
router.post('/sections', verify, async (req, res) => {
  try {
    const { title, sort_order } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    const { rows } = await db.query(
      'INSERT INTO library_sections (title, sort_order) VALUES ($1,$2) RETURNING *',
      [title, sort_order || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /library/sections:', err);
    res.status(500).json({ error: 'Failed to create section' });
  }
});

// PUT update section
router.put('/sections/:id', verify, async (req, res) => {
  try {
    const { title, sort_order } = req.body;
    const { rows } = await db.query(
      'UPDATE library_sections SET title=$1, sort_order=$2 WHERE id=$3 RETURNING *',
      [title, sort_order || 0, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Section not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /library/sections/:id:', err);
    res.status(500).json({ error: 'Failed to update section' });
  }
});

// DELETE section
router.delete('/sections/:id', verify, async (req, res) => {
  try {
    await db.query('DELETE FROM library_sections WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('DELETE /library/sections/:id:', err);
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

// GET all videos (with section title)
router.get('/videos', verify, async (req, res) => {
  try {
    const { section_id } = req.query;
    let q = `
      SELECT lv.*, ls.title AS section_title
      FROM library_videos lv
      LEFT JOIN library_sections ls ON ls.id = lv.section_id
      WHERE 1=1
    `;
    const p = [];
    if (section_id) { p.push(section_id); q += ` AND lv.section_id = $${p.length}`; }
    q += ' ORDER BY lv.sort_order, lv.label';
    const { rows } = await db.query(q, p);
    res.json(rows);
  } catch (err) {
    console.error('GET /library/videos:', err);
    res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

// POST create video
router.post('/videos', verify, async (req, res) => {
  try {
    const { section_id, label, caption, video_id, sort_order } = req.body;
    if (!label || !video_id) return res.status(400).json({ error: 'Label and video_id required' });
    const { rows } = await db.query(
      'INSERT INTO library_videos (section_id, label, caption, video_id, sort_order) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [section_id || null, label, caption || '', video_id, sort_order || 0]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('POST /library/videos:', err);
    res.status(500).json({ error: 'Failed to create video' });
  }
});

// PUT update video
router.put('/videos/:id', verify, async (req, res) => {
  try {
    const { section_id, label, caption, video_id, sort_order } = req.body;
    const { rows } = await db.query(
      'UPDATE library_videos SET section_id=$1, label=$2, caption=$3, video_id=$4, sort_order=$5, updated_at=NOW() WHERE id=$6 RETURNING *',
      [section_id || null, label, caption || '', video_id, sort_order || 0, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Video not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('PUT /library/videos/:id:', err);
    res.status(500).json({ error: 'Failed to update video' });
  }
});

// DELETE video
router.delete('/videos/:id', verify, async (req, res) => {
  try {
    await db.query('DELETE FROM library_videos WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('DELETE /library/videos/:id:', err);
    res.status(500).json({ error: 'Failed to delete video' });
  }
});

module.exports = router;
