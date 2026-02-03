const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const scoringService = require('../services/scoring');

const router = express.Router();

/**
 * POST /api/predictions/team
 * Submit or update team prediction (TP1, TP2, TP3)
 */
router.post('/team',
  authenticateToken,
  [
    body('predictionType').isIn(['TP1', 'TP2', 'TP3']),
    body('winnerTeamId').isInt(),
    body('runnerUpTeamId').isInt(),
    body('groupName').optional().isLength({ min: 1, max: 1 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { predictionType, winnerTeamId, runnerUpTeamId, groupName } = req.body;
    const userId = req.user.userId;

    try {
      // Check deadline for TP1 and TP2 (before Game 1 or by 06/16)
      if (predictionType === 'TP1' || predictionType === 'TP2') {
        const firstMatch = await db.query(
          'SELECT match_date FROM matches ORDER BY match_date ASC LIMIT 1'
        );
        
        const deadline = new Date('2026-06-16'); // Configurable deadline
        const now = new Date();
        
        if (firstMatch.rows.length > 0 && now > new Date(firstMatch.rows[0].match_date) && now > deadline) {
          return res.status(403).json({ error: 'Deadline passed for this prediction type' });
        }
      }

      // Check deadline for TP3 (before 06/27)
      if (predictionType === 'TP3') {
        const deadline = new Date('2026-06-27');
        if (new Date() > deadline) {
          return res.status(403).json({ error: 'Deadline passed for TP3 predictions' });
        }

        // Check if original TP1 team was eliminated in qualifying
        const tp1 = await db.query(
          'SELECT winner_team_id FROM team_predictions WHERE user_id = $1 AND prediction_type = $2',
          [userId, 'TP1']
        );

        if (tp1.rows.length === 0) {
          return res.status(400).json({ error: 'Must have TP1 prediction before TP3' });
        }

        // TODO: Add logic to verify team was eliminated in qualifying round
      }

      // Insert or update prediction
      const result = await db.query(
        `INSERT INTO team_predictions (user_id, prediction_type, winner_team_id, runner_up_team_id, group_name)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, prediction_type, group_name)
         DO UPDATE SET winner_team_id = $3, runner_up_team_id = $4
         RETURNING *`,
        [userId, predictionType, winnerTeamId, runnerUpTeamId, groupName || null]
      );

      res.json({
        message: 'Team prediction submitted successfully',
        prediction: result.rows[0]
      });
    } catch (error) {
      console.error('Team prediction error:', error);
      res.status(500).json({ error: 'Server error submitting prediction' });
    }
  }
);

/**
 * POST /api/predictions/match
 * Submit or update match prediction
 */
router.post('/match',
  authenticateToken,
  [
    body('matchId').isInt(),
    body('predictedTeam1Score').isInt({ min: 0 }),
    body('predictedTeam2Score').isInt({ min: 0 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { matchId, predictedTeam1Score, predictedTeam2Score } = req.body;
    const userId = req.user.userId;

    try {
      // Get match details
      const match = await db.query(
        'SELECT * FROM matches WHERE id = $1',
        [matchId]
      );

      if (match.rows.length === 0) {
        return res.status(404).json({ error: 'Match not found' });
      }

      const matchData = match.rows[0];

      // Check if match has already started (15 minutes before kickoff)
      const deadlineMinutes = parseInt(process.env.PREDICTION_DEADLINE_MINUTES) || 15;
      const deadline = new Date(matchData.match_date);
      deadline.setMinutes(deadline.getMinutes() - deadlineMinutes);

      if (new Date() > deadline) {
        return res.status(403).json({ error: 'Prediction deadline has passed for this match' });
      }

      // Determine predicted winner
      let predictedWinner = 'draw';
      if (predictedTeam1Score > predictedTeam2Score) predictedWinner = 'team1';
      if (predictedTeam2Score > predictedTeam1Score) predictedWinner = 'team2';

      // Insert or update prediction
      const result = await db.query(
        `INSERT INTO match_predictions (user_id, match_id, predicted_team1_score, predicted_team2_score, predicted_winner, updated_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, match_id)
         DO UPDATE SET 
           predicted_team1_score = $3,
           predicted_team2_score = $4,
           predicted_winner = $5,
           updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [userId, matchId, predictedTeam1Score, predictedTeam2Score, predictedWinner]
      );

      res.json({
        message: 'Match prediction submitted successfully',
        prediction: result.rows[0]
      });
    } catch (error) {
      console.error('Match prediction error:', error);
      res.status(500).json({ error: 'Server error submitting prediction' });
    }
  }
);

/**
 * GET /api/predictions/user
 * Get all predictions for the authenticated user
 */
router.get('/user', authenticateToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const teamPredictions = await db.query(
      `SELECT tp.*, t1.name as winner_name, t2.name as runner_up_name
       FROM team_predictions tp
       LEFT JOIN teams t1 ON tp.winner_team_id = t1.id
       LEFT JOIN teams t2 ON tp.runner_up_team_id = t2.id
       WHERE tp.user_id = $1`,
      [userId]
    );

    const matchPredictions = await db.query(
      `SELECT mp.*, m.match_date, m.round, m.is_completed,
         t1.name as team1_name, t2.name as team2_name,
         m.team1_score, m.team2_score
       FROM match_predictions mp
       JOIN matches m ON mp.match_id = m.id
       JOIN teams t1 ON m.team1_id = t1.id
       JOIN teams t2 ON m.team2_id = t2.id
       WHERE mp.user_id = $1
       ORDER BY m.match_date ASC`,
      [userId]
    );

    res.json({
      teamPredictions: teamPredictions.rows,
      matchPredictions: matchPredictions.rows
    });
  } catch (error) {
    console.error('Get predictions error:', error);
    res.status(500).json({ error: 'Server error fetching predictions' });
  }
});

/**
 * POST /api/predictions/multiplier
 * Activate Double Up or Re-Double Up multiplier
 */
router.post('/multiplier',
  authenticateToken,
  [
    body('teamId').isInt(),
    body('multiplierType').isIn(['double_up', 're_double_up'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { teamId, multiplierType } = req.body;
    const userId = req.user.userId;

    try {
      // Check deadlines
      if (multiplierType === 'double_up') {
        const deadline = new Date('2026-06-23T23:59:59');
        if (new Date() > deadline) {
          return res.status(403).json({ error: 'Deadline passed for Double Up' });
        }

        // Check if team qualifies (less than 6 points after 2 games)
        const canActivate = await scoringService.canActivateDoubleUp(teamId);
        if (!canActivate) {
          return res.status(400).json({ 
            error: 'Team does not qualify for Double Up (must have < 6 points after 2 games)' 
          });
        }
      }

      if (multiplierType === 're_double_up') {
        const deadline = new Date('2026-06-27');
        if (new Date() < deadline) {
          return res.status(403).json({ error: 'Re-Double Up can only be activated after 06/27' });
        }
      }

      // Activate multiplier
      await db.query(
        `INSERT INTO multipliers (user_id, team_id, multiplier_type, is_active, activated_at)
         VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, team_id, multiplier_type)
         DO UPDATE SET is_active = true, activated_at = CURRENT_TIMESTAMP`,
        [userId, teamId, multiplierType]
      );

      // Recalculate user points
      await scoringService.recalculateUserPoints(userId);

      res.json({ message: 'Multiplier activated successfully' });
    } catch (error) {
      console.error('Multiplier activation error:', error);
      res.status(500).json({ error: 'Server error activating multiplier' });
    }
  }
);

module.exports = router;
