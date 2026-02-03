const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/matches
 * Get all matches, optionally filtered by round or date
 */
router.get('/', async (req, res) => {
  const { round, upcoming } = req.query;

  try {
    let query = `
      SELECT m.*, 
        t1.name as team1_name, t1.country_code as team1_code,
        t2.name as team2_name, t2.country_code as team2_code
      FROM matches m
      JOIN teams t1 ON m.team1_id = t1.id
      JOIN teams t2 ON m.team2_id = t2.id
      WHERE 1=1
    `;
    const params = [];

    if (round) {
      params.push(round);
      query += ` AND m.round = $${params.length}`;
    }

    if (upcoming === 'true') {
      query += ` AND m.match_date > CURRENT_TIMESTAMP AND m.is_completed = false`;
    }

    query += ' ORDER BY m.match_date ASC';

    const result = await db.query(query, params);

    res.json({ matches: result.rows });
  } catch (error) {
    console.error('Get matches error:', error);
    res.status(500).json({ error: 'Server error fetching matches' });
  }
});

/**
 * GET /api/matches/current
 * Get currently playing matches
 */
router.get('/current', async (req, res) => {
  try {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const result = await db.query(
      `SELECT m.*, 
        t1.name as team1_name, t1.country_code as team1_code,
        t2.name as team2_name, t2.country_code as team2_code
       FROM matches m
       JOIN teams t1 ON m.team1_id = t1.id
       JOIN teams t2 ON m.team2_id = t2.id
       WHERE m.match_date BETWEEN $1 AND $2
         AND m.is_completed = false
       ORDER BY m.match_date ASC`,
      [twoHoursAgo, now]
    );

    res.json({ matches: result.rows });
  } catch (error) {
    console.error('Get current matches error:', error);
    res.status(500).json({ error: 'Server error fetching current matches' });
  }
});

/**
 * GET /api/matches/:id
 * Get single match by ID
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      `SELECT m.*, 
        t1.name as team1_name, t1.country_code as team1_code,
        t2.name as team2_name, t2.country_code as team2_code
       FROM matches m
       JOIN teams t1 ON m.team1_id = t1.id
       JOIN teams t2 ON m.team2_id = t2.id
       WHERE m.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    res.json({ match: result.rows[0] });
  } catch (error) {
    console.error('Get match error:', error);
    res.status(500).json({ error: 'Server error fetching match' });
  }
});

/**
 * GET /api/matches/:id/predictions
 * Get all predictions for a specific match (admin only or for stats)
 */
router.get('/:id/predictions', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Only show predictions after match is completed
    const match = await db.query(
      'SELECT is_completed FROM matches WHERE id = $1',
      [id]
    );

    if (match.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    if (!match.rows[0].is_completed) {
      return res.status(403).json({ error: 'Predictions hidden until match completes' });
    }

    const result = await db.query(
      `SELECT mp.*, u.username
       FROM match_predictions mp
       JOIN users u ON mp.user_id = u.id
       WHERE mp.match_id = $1
       ORDER BY mp.created_at ASC`,
      [id]
    );

    res.json({ predictions: result.rows });
  } catch (error) {
    console.error('Get match predictions error:', error);
    res.status(500).json({ error: 'Server error fetching predictions' });
  }
});

module.exports = router;
