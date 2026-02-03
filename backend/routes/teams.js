const express = require('express');
const db = require('../db');

const router = express.Router();

/**
 * GET /api/teams
 * Get all teams, optionally filtered by group
 */
router.get('/', async (req, res) => {
  const { group } = req.query;

  try {
    let query = 'SELECT * FROM teams WHERE 1=1';
    const params = [];

    if (group) {
      params.push(group);
      query += ` AND group_name = $${params.length}`;
    }

    query += ' ORDER BY group_name, name ASC';

    const result = await db.query(query, params);

    res.json({ teams: result.rows });
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Server error fetching teams' });
  }
});

/**
 * GET /api/teams/:id
 * Get single team by ID
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      'SELECT * FROM teams WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({ team: result.rows[0] });
  } catch (error) {
    console.error('Get team error:', error);
    res.status(500).json({ error: 'Server error fetching team' });
  }
});

/**
 * GET /api/teams/group/:groupName
 * Get all teams in a specific group
 */
router.get('/group/:groupName', async (req, res) => {
  const { groupName } = req.params;

  try {
    const result = await db.query(
      'SELECT * FROM teams WHERE group_name = $1 ORDER BY name ASC',
      [groupName]
    );

    res.json({ teams: result.rows });
  } catch (error) {
    console.error('Get group teams error:', error);
    res.status(500).json({ error: 'Server error fetching teams' });
  }
});

module.exports = router;
