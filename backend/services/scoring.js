const db = require('../db');

/**
 * Fantasy Football League Scoring Engine
 * Handles all point calculations based on predictions and match results
 */

class ScoringService {
  
  /**
   * Calculate points for team predictions (TP1, TP2, TP3)
   */
  async calculateTeamPredictionPoints(userId, predictionType) {
    let points = 0;
    
    try {
      const prediction = await db.query(
        'SELECT * FROM team_predictions WHERE user_id = $1 AND prediction_type = $2',
        [userId, predictionType]
      );

      if (prediction.rows.length === 0) return 0;

      const pred = prediction.rows[0];
      
      if (predictionType === 'TP1' || predictionType === 'TP3') {
        // Check tournament winner and runner-up
        const finalMatch = await db.query(
          `SELECT * FROM matches WHERE round = 'final' AND is_completed = true ORDER BY match_date DESC LIMIT 1`
        );

        if (finalMatch.rows.length > 0) {
          const match = finalMatch.rows[0];
          const winnerId = match.team1_score > match.team2_score ? match.team1_id : match.team2_id;
          const runnerUpId = match.team1_score > match.team2_score ? match.team2_id : match.team1_id;

          // Check for multipliers
          const multiplier = await this.getActiveMultiplier(userId, pred.winner_team_id);

          if (pred.winner_team_id === winnerId) {
            points += 500 * multiplier;
          }
          if (pred.runner_up_team_id === runnerUpId) {
            points += 300 * multiplier;
          }
        }
      } else if (predictionType === 'TP2') {
        // Check qualifying round group leader
        const groupLeader = await this.getQualifyingRoundLeader(pred.group_name);
        
        if (groupLeader.length >= 2) {
          const multiplier = await this.getActiveMultiplier(userId, pred.winner_team_id);
          
          if (pred.winner_team_id === groupLeader[0].team_id) {
            points += 200 * multiplier;
          }
          if (pred.runner_up_team_id === groupLeader[1].team_id) {
            points += 100 * multiplier;
          }
        }
      }

      return points;
    } catch (error) {
      console.error('Error calculating team prediction points:', error);
      return 0;
    }
  }

  /**
   * Get qualifying round leader by group
   */
  async getQualifyingRoundLeader(groupName) {
    const query = `
      WITH group_standings AS (
        SELECT 
          t.id as team_id,
          t.name,
          COUNT(CASE WHEN 
            (m.team1_id = t.id AND m.team1_score > m.team2_score) OR
            (m.team2_id = t.id AND m.team2_score > m.team1_score)
          THEN 1 END) * 3 as wins_points,
          COUNT(CASE WHEN m.team1_score = m.team2_score THEN 1 END) as draw_points,
          SUM(CASE WHEN m.team1_id = t.id THEN m.team1_score ELSE m.team2_score END) -
          SUM(CASE WHEN m.team1_id = t.id THEN m.team2_score ELSE m.team1_score END) as goal_differential
        FROM teams t
        LEFT JOIN matches m ON (m.team1_id = t.id OR m.team2_id = t.id)
          AND m.round = 'qualifying' AND m.is_completed = true
        WHERE t.group_name = $1
        GROUP BY t.id, t.name
      )
      SELECT 
        team_id,
        name,
        (wins_points + draw_points) as total_points,
        goal_differential
      FROM group_standings
      ORDER BY total_points DESC, goal_differential DESC
      LIMIT 2
    `;
    
    const result = await db.query(query, [groupName]);
    return result.rows;
  }

  /**
   * Calculate points for match predictions
   */
  async calculateMatchPredictionPoints(userId, matchId) {
    try {
      const prediction = await db.query(
        'SELECT * FROM match_predictions WHERE user_id = $1 AND match_id = $2',
        [userId, matchId]
      );

      if (prediction.rows.length === 0) return 0;

      const match = await db.query(
        'SELECT * FROM matches WHERE id = $1 AND is_completed = true',
        [matchId]
      );

      if (match.rows.length === 0) return 0;

      const pred = prediction.rows[0];
      const actualMatch = match.rows[0];
      
      // Determine actual winner
      let actualWinner = 'draw';
      if (actualMatch.team1_score > actualMatch.team2_score) actualWinner = 'team1';
      if (actualMatch.team2_score > actualMatch.team1_score) actualWinner = 'team2';

      // Base points based on round
      const roundPoints = {
        'qualifying': { outcome: 5, exact: 25 },
        'round_of_16': { outcome: 10, exact: 50 },
        'quarterfinals': { outcome: 15, exact: 75 },
        'semifinals': { outcome: 20, exact: 100 },
        'final': { outcome: 25, exact: 125 }
      };

      const points = roundPoints[actualMatch.round] || { outcome: 5, exact: 25 };
      let totalPoints = 0;

      // Check for exact score match
      if (pred.predicted_team1_score === actualMatch.team1_score && 
          pred.predicted_team2_score === actualMatch.team2_score) {
        totalPoints = points.exact;
      } 
      // Check for correct outcome
      else if (pred.predicted_winner === actualWinner) {
        totalPoints = points.outcome;
      }

      // Apply multipliers if applicable
      const teams = [actualMatch.team1_id, actualMatch.team2_id];
      let maxMultiplier = 1;
      
      for (const teamId of teams) {
        const multiplier = await this.getActiveMultiplier(userId, teamId);
        if (multiplier > maxMultiplier) {
          maxMultiplier = multiplier;
        }
      }

      return totalPoints * maxMultiplier;
    } catch (error) {
      console.error('Error calculating match prediction points:', error);
      return 0;
    }
  }

  /**
   * Get active multiplier for a team (considers both Double Up and Re-Double Up)
   */
  async getActiveMultiplier(userId, teamId) {
    const multipliers = await db.query(
      `SELECT * FROM multipliers 
       WHERE user_id = $1 AND team_id = $2 AND is_active = true`,
      [userId, teamId]
    );

    let totalMultiplier = 1;
    multipliers.rows.forEach(m => {
      if (m.multiplier_type === 'double_up') totalMultiplier *= 2;
      if (m.multiplier_type === 're_double_up') totalMultiplier *= 2;
    });

    return totalMultiplier;
  }

  /**
   * Check if team qualifies for Double Up (less than 6 points after 2 games)
   */
  async canActivateDoubleUp(teamId) {
    const query = `
      SELECT COUNT(*) as games_played,
        COUNT(CASE WHEN 
          (m.team1_id = $1 AND m.team1_score > m.team2_score) OR
          (m.team2_id = $1 AND m.team2_score > m.team1_score)
        THEN 1 END) * 3 +
        COUNT(CASE WHEN m.team1_score = m.team2_score THEN 1 END) as total_points
      FROM matches m
      WHERE (m.team1_id = $1 OR m.team2_id = $1) 
        AND m.round = 'qualifying' 
        AND m.is_completed = true
    `;
    
    const result = await db.query(query, [teamId]);
    const { games_played, total_points } = result.rows[0];
    
    return games_played >= 2 && total_points < 6;
  }

  /**
   * Recalculate all points for a user
   */
  async recalculateUserPoints(userId) {
    let tp1Points = 0;
    let tp2Points = 0;
    let tp3Points = 0;
    let matchPoints = 0;

    // Calculate TP1 points
    tp1Points = await this.calculateTeamPredictionPoints(userId, 'TP1');

    // Calculate TP2 points for all groups
    const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    for (const group of groups) {
      const points = await this.calculateTeamPredictionPoints(userId, 'TP2');
      tp2Points += points;
    }

    // Calculate TP3 points
    tp3Points = await this.calculateTeamPredictionPoints(userId, 'TP3');

    // Calculate match prediction points
    const userMatches = await db.query(
      'SELECT match_id FROM match_predictions WHERE user_id = $1',
      [userId]
    );

    for (const row of userMatches.rows) {
      const points = await this.calculateMatchPredictionPoints(userId, row.match_id);
      matchPoints += points;
    }

    const totalPoints = tp1Points + tp2Points + tp3Points + matchPoints;

    // Update user_points table
    await db.query(
      `INSERT INTO user_points (user_id, total_points, tp1_points, tp2_points, tp3_points, match_points, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         total_points = $2,
         tp1_points = $3,
         tp2_points = $4,
         tp3_points = $5,
         match_points = $6,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, totalPoints, tp1Points, tp2Points, tp3Points, matchPoints]
    );

    return { totalPoints, tp1Points, tp2Points, tp3Points, matchPoints };
  }

  /**
   * Recalculate points for all users (run after matches are updated)
   */
  async recalculateAllPoints() {
    const users = await db.query('SELECT id FROM users');
    
    for (const user of users.rows) {
      await this.recalculateUserPoints(user.id);
    }
    
    console.log('All user points recalculated');
  }
}

module.exports = new ScoringService();
