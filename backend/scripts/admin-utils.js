const { Pool } = require('pg');
const scoringService = require('../services/scoring');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

/**
 * Admin utilities for managing the fantasy league
 * Run with: node scripts/admin-utils.js [command]
 */

async function showLeaderboard() {
  console.log('\n🏆 CURRENT LEADERBOARD\n');
  console.log('═'.repeat(60));
  
  const result = await pool.query(`
    SELECT 
      ROW_NUMBER() OVER (ORDER BY COALESCE(up.total_points, 0) DESC) as rank,
      u.username,
      COALESCE(up.total_points, 0) as total_points,
      COALESCE(up.tp1_points, 0) as tp1,
      COALESCE(up.tp2_points, 0) as tp2,
      COALESCE(up.tp3_points, 0) as tp3,
      COALESCE(up.match_points, 0) as match
    FROM users u
    LEFT JOIN user_points up ON u.id = up.user_id
    ORDER BY total_points DESC
    LIMIT 20
  `);

  result.rows.forEach(row => {
    const medal = row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : '  ';
    console.log(`${medal} ${String(row.rank).padStart(2)}. ${row.username.padEnd(20)} | ${String(row.total_points).padStart(6)} pts`);
    console.log(`     TP1: ${row.tp1}  TP2: ${row.tp2}  TP3: ${row.tp3}  Match: ${row.match}`);
  });
  
  console.log('═'.repeat(60));
}

async function updateMatchResult(matchId, team1Score, team2Score) {
  console.log(`\n⚽ Updating match ${matchId}: ${team1Score} - ${team2Score}\n`);
  
  // Get match details
  const match = await pool.query(`
    SELECT m.*, t1.name as team1_name, t2.name as team2_name
    FROM matches m
    JOIN teams t1 ON m.team1_id = t1.id
    JOIN teams t2 ON m.team2_id = t2.id
    WHERE m.id = $1
  `, [matchId]);

  if (match.rows.length === 0) {
    console.log('❌ Match not found');
    return;
  }

  const matchData = match.rows[0];
  console.log(`Match: ${matchData.team1_name} vs ${matchData.team2_name}`);
  console.log(`Round: ${matchData.round}`);
  
  // Update match
  await pool.query(`
    UPDATE matches 
    SET team1_score = $1, team2_score = $2, is_completed = true 
    WHERE id = $3
  `, [team1Score, team2Score, matchId]);

  console.log('✅ Match updated');
  console.log('\n📊 Recalculating all user points...\n');
  
  // Recalculate points for all users
  await scoringService.recalculateAllPoints();
  
  console.log('✅ Points recalculated for all users\n');
}

async function listUpcomingMatches() {
  console.log('\n📅 UPCOMING MATCHES\n');
  console.log('═'.repeat(80));
  
  const result = await pool.query(`
    SELECT 
      m.id,
      t1.name as team1_name,
      t2.name as team2_name,
      m.match_date,
      m.round
    FROM matches m
    JOIN teams t1 ON m.team1_id = t1.id
    JOIN teams t2 ON m.team2_id = t2.id
    WHERE m.is_completed = false
    ORDER BY m.match_date ASC
    LIMIT 20
  `);

  result.rows.forEach(match => {
    const date = new Date(match.match_date).toLocaleString();
    console.log(`ID: ${String(match.id).padStart(3)} | ${match.team1_name.padEnd(20)} vs ${match.team2_name.padEnd(20)} | ${date} | ${match.round}`);
  });
  
  console.log('═'.repeat(80));
}

async function viewUserStats(username) {
  console.log(`\n📊 USER STATISTICS: ${username}\n`);
  console.log('═'.repeat(60));
  
  const user = await pool.query(`
    SELECT u.*, up.*
    FROM users u
    LEFT JOIN user_points up ON u.id = up.user_id
    WHERE u.username = $1
  `, [username]);

  if (user.rows.length === 0) {
    console.log('❌ User not found');
    return;
  }

  const userData = user.rows[0];
  console.log(`Username: ${userData.username}`);
  console.log(`Email: ${userData.email}`);
  console.log(`Total Points: ${userData.total_points || 0}`);
  console.log(`  - TP1 Points: ${userData.tp1_points || 0}`);
  console.log(`  - TP2 Points: ${userData.tp2_points || 0}`);
  console.log(`  - TP3 Points: ${userData.tp3_points || 0}`);
  console.log(`  - Match Points: ${userData.match_points || 0}`);
  
  // Show team predictions
  const teamPreds = await pool.query(`
    SELECT tp.*, t1.name as winner_name, t2.name as runnerup_name
    FROM team_predictions tp
    LEFT JOIN teams t1 ON tp.winner_team_id = t1.id
    LEFT JOIN teams t2 ON tp.runner_up_team_id = t2.id
    WHERE tp.user_id = $1
  `, [userData.id]);

  if (teamPreds.rows.length > 0) {
    console.log('\nTeam Predictions:');
    teamPreds.rows.forEach(pred => {
      console.log(`  ${pred.prediction_type}: Winner: ${pred.winner_name}, Runner-up: ${pred.runnerup_name}`);
    });
  }

  // Show number of match predictions
  const matchPreds = await pool.query(`
    SELECT COUNT(*) as count
    FROM match_predictions
    WHERE user_id = $1
  `, [userData.id]);

  console.log(`\nMatch Predictions Made: ${matchPreds.rows[0].count}`);
  console.log('═'.repeat(60));
}

async function recalculateAllPoints() {
  console.log('\n🔄 RECALCULATING ALL POINTS\n');
  await scoringService.recalculateAllPoints();
  console.log('✅ All points recalculated\n');
}

async function showStats() {
  console.log('\n📈 LEAGUE STATISTICS\n');
  console.log('═'.repeat(60));
  
  const users = await pool.query('SELECT COUNT(*) FROM users');
  const teams = await pool.query('SELECT COUNT(*) FROM teams');
  const matches = await pool.query('SELECT COUNT(*) FROM matches');
  const completedMatches = await pool.query('SELECT COUNT(*) FROM matches WHERE is_completed = true');
  const predictions = await pool.query('SELECT COUNT(*) FROM match_predictions');
  const teamPredictions = await pool.query('SELECT COUNT(*) FROM team_predictions');
  
  console.log(`Total Users: ${users.rows[0].count}`);
  console.log(`Total Teams: ${teams.rows[0].count}`);
  console.log(`Total Matches: ${matches.rows[0].count}`);
  console.log(`Completed Matches: ${completedMatches.rows[0].count}`);
  console.log(`Match Predictions: ${predictions.rows[0].count}`);
  console.log(`Team Predictions: ${teamPredictions.rows[0].count}`);
  console.log('═'.repeat(60));
}

// Command-line interface
async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  try {
    switch (command) {
      case 'leaderboard':
        await showLeaderboard();
        break;
      
      case 'update-match':
        if (args.length !== 3) {
          console.log('Usage: node admin-utils.js update-match <matchId> <team1Score> <team2Score>');
          break;
        }
        await updateMatchResult(parseInt(args[0]), parseInt(args[1]), parseInt(args[2]));
        break;
      
      case 'upcoming':
        await listUpcomingMatches();
        break;
      
      case 'user':
        if (args.length !== 1) {
          console.log('Usage: node admin-utils.js user <username>');
          break;
        }
        await viewUserStats(args[0]);
        break;
      
      case 'recalculate':
        await recalculateAllPoints();
        break;
      
      case 'stats':
        await showStats();
        break;
      
      default:
        console.log('\n⚙️  FANTASY LEAGUE ADMIN UTILITIES\n');
        console.log('Available commands:');
        console.log('  leaderboard                              - Show current leaderboard');
        console.log('  update-match <id> <score1> <score2>     - Update match result');
        console.log('  upcoming                                 - List upcoming matches');
        console.log('  user <username>                          - View user statistics');
        console.log('  recalculate                              - Recalculate all points');
        console.log('  stats                                    - Show league statistics');
        console.log('\nExamples:');
        console.log('  node admin-utils.js leaderboard');
        console.log('  node admin-utils.js update-match 1 2 1');
        console.log('  node admin-utils.js user john_doe\n');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
