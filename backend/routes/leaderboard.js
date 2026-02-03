const express = require('express');
const db = require('../db');

const router = express.Router();

/**
 * GET /api/leaderboard
 * Get the current leaderboard with all users and their points
 */
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT 
        u.id,
        u.username,
        COALESCE(up.total_points, 0) as total_points,
        COALESCE(up.tp1_points, 0) as tp1_points,
        COALESCE(up.tp2_points, 0) as tp2_points,
        COALESCE(up.tp3_points, 0) as tp3_points,
        COALESCE(up.match_points, 0) as match_points,
        up.updated_at,
        ROW_NUMBER() OVER (ORDER BY COALESCE(up.total_points, 0) DESC, u.username ASC) as rank
       FROM users u
       LEFT JOIN user_points up ON u.id = up.user_id
       ORDER BY total_points DESC, u.username ASC`
    );

    res.json({ leaderboard: result.rows });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Server error fetching leaderboard' });
  }
});

/**
 * GET /api/leaderboard/top/:limit
 * Get top N users from leaderboard
 */
router.get('/top/:limit', async (req, res) => {
  const limit = parseInt(req.params.limit) || 10;

  try {
    const result = await db.query(
      `SELECT 
        u.id,
        u.username,
        COALESCE(up.total_points, 0) as total_points,
        COALESCE(up.tp1_points, 0) as tp1_points,
        COALESCE(up.tp2_points, 0) as tp2_points,
        COALESCE(up.tp3_points, 0) as tp3_points,
        COALESCE(up.match_points, 0) as match_points,
        ROW_NUMBER() OVER (ORDER BY COALESCE(up.total_points, 0) DESC, u.username ASC) as rank
       FROM users u
       LEFT JOIN user_points up ON u.id = up.user_id
       ORDER BY total_points DESC, u.username ASC
       LIMIT $1`,
      [limit]
    );

    res.json({ leaderboard: result.rows });
  } catch (error) {
    console.error('Get top leaderboard error:', error);
    res.status(500).json({ error: 'Server error fetching leaderboard' });
  }
});

module.exports = router;
