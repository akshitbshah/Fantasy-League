const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Initializing database...');
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, '../schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schema);
    console.log('✓ Schema created');

    // Insert sample teams (FIFA World Cup 2026 - 48 teams)
    console.log('Inserting teams...');
    const teams = [
      // Group A
      { name: 'United States', code: 'USA', group: 'A' },
      { name: 'Mexico', code: 'MEX', group: 'A' },
      { name: 'Canada', code: 'CAN', group: 'A' },
      { name: 'Uruguay', code: 'URU', group: 'A' },
      
      // Group B
      { name: 'Brazil', code: 'BRA', group: 'B' },
      { name: 'Argentina', code: 'ARG', group: 'B' },
      { name: 'Colombia', code: 'COL', group: 'B' },
      { name: 'Ecuador', code: 'ECU', group: 'B' },
      
      // Group C
      { name: 'Germany', code: 'GER', group: 'C' },
      { name: 'Spain', code: 'ESP', group: 'C' },
      { name: 'Netherlands', code: 'NED', group: 'C' },
      { name: 'Belgium', code: 'BEL', group: 'C' },
      
      // Group D
      { name: 'France', code: 'FRA', group: 'D' },
      { name: 'England', code: 'ENG', group: 'D' },
      { name: 'Portugal', code: 'POR', group: 'D' },
      { name: 'Croatia', code: 'CRO', group: 'D' },
      
      // Group E
      { name: 'Italy', code: 'ITA', group: 'E' },
      { name: 'Switzerland', code: 'SUI', group: 'E' },
      { name: 'Denmark', code: 'DEN', group: 'E' },
      { name: 'Austria', code: 'AUT', group: 'E' },
      
      // Group F
      { name: 'Japan', code: 'JPN', group: 'F' },
      { name: 'South Korea', code: 'KOR', group: 'F' },
      { name: 'Australia', code: 'AUS', group: 'F' },
      { name: 'Saudi Arabia', code: 'KSA', group: 'F' },
      
      // Group G
      { name: 'Morocco', code: 'MAR', group: 'G' },
      { name: 'Senegal', code: 'SEN', group: 'G' },
      { name: 'Nigeria', code: 'NGA', group: 'G' },
      { name: 'Ghana', code: 'GHA', group: 'G' },
      
      // Group H
      { name: 'Poland', code: 'POL', group: 'H' },
      { name: 'Sweden', code: 'SWE', group: 'H' },
      { name: 'Ukraine', code: 'UKR', group: 'H' },
      { name: 'Serbia', code: 'SRB', group: 'H' },
      
      // Additional teams for 48-team format
      { name: 'Chile', code: 'CHI', group: 'A' },
      { name: 'Peru', code: 'PER', group: 'B' },
      { name: 'Costa Rica', code: 'CRC', group: 'C' },
      { name: 'Jamaica', code: 'JAM', group: 'D' },
      { name: 'Turkey', code: 'TUR', group: 'E' },
      { name: 'Iran', code: 'IRN', group: 'F' },
      { name: 'Egypt', code: 'EGY', group: 'G' },
      { name: 'Tunisia', code: 'TUN', group: 'H' },
      { name: 'Panama', code: 'PAN', group: 'A' },
      { name: 'Paraguay', code: 'PAR', group: 'B' },
      { name: 'Czech Republic', code: 'CZE', group: 'C' },
      { name: 'Wales', code: 'WAL', group: 'D' },
      { name: 'Norway', code: 'NOR', group: 'E' },
      { name: 'Qatar', code: 'QAT', group: 'F' },
      { name: 'Cameroon', code: 'CMR', group: 'G' },
      { name: 'Algeria', code: 'ALG', group: 'H' }
    ];

    for (const team of teams) {
      await client.query(
        'INSERT INTO teams (name, country_code, group_name) VALUES ($1, $2, $3)',
        [team.name, team.code, team.group]
      );
    }
    console.log(`✓ Inserted ${teams.length} teams`);

    // Insert sample matches (qualifying round - group stage)
    console.log('Inserting sample matches...');
    
    // Get team IDs for match creation
    const teamsResult = await client.query('SELECT id, group_name FROM teams ORDER BY group_name, id');
    const teamsByGroup = {};
    
    teamsResult.rows.forEach(team => {
      if (!teamsByGroup[team.group_name]) {
        teamsByGroup[team.group_name] = [];
      }
      teamsByGroup[team.group_name].push(team.id);
    });

    // Create qualifying matches for each group
    const matchDate = new Date('2026-06-11T12:00:00Z');
    let matchCount = 0;

    for (const group in teamsByGroup) {
      const teamIds = teamsByGroup[group];
      
      // Create round-robin matches for each group (each team plays others once)
      for (let i = 0; i < teamIds.length; i++) {
        for (let j = i + 1; j < teamIds.length; j++) {
          const currentDate = new Date(matchDate);
          currentDate.setHours(matchDate.getHours() + matchCount * 3);
          
          await client.query(
            `INSERT INTO matches (team1_id, team2_id, match_date, round, is_completed)
             VALUES ($1, $2, $3, $4, $5)`,
            [teamIds[i], teamIds[j], currentDate, 'qualifying', false]
          );
          
          matchCount++;
        }
      }
    }
    
    console.log(`✓ Inserted ${matchCount} qualifying matches`);

    // Create some knockout round placeholder matches
    // Round of 16 (16 matches)
    const roundOf16Date = new Date('2026-06-28T12:00:00Z');
    for (let i = 0; i < 16; i++) {
      const currentDate = new Date(roundOf16Date);
      currentDate.setHours(roundOf16Date.getHours() + i * 4);
      
      await client.query(
        `INSERT INTO matches (team1_id, team2_id, match_date, round, is_completed)
         VALUES ($1, $2, $3, $4, $5)`,
        [1, 2, currentDate, 'round_of_16', false] // Placeholder teams
      );
    }
    console.log('✓ Inserted 16 Round of 16 matches');

    // Quarter finals (8 matches)
    const quarterDate = new Date('2026-07-04T12:00:00Z');
    for (let i = 0; i < 8; i++) {
      const currentDate = new Date(quarterDate);
      currentDate.setHours(quarterDate.getHours() + i * 5);
      
      await client.query(
        `INSERT INTO matches (team1_id, team2_id, match_date, round, is_completed)
         VALUES ($1, $2, $3, $4, $5)`,
        [1, 2, currentDate, 'quarterfinals', false]
      );
    }
    console.log('✓ Inserted 8 Quarter Final matches');

    // Semi finals (2 matches)
    await client.query(
      `INSERT INTO matches (team1_id, team2_id, match_date, round, is_completed)
       VALUES ($1, $2, $3, $4, $5)`,
      [1, 2, new Date('2026-07-10T15:00:00Z'), 'semifinals', false]
    );
    
    await client.query(
      `INSERT INTO matches (team1_id, team2_id, match_date, round, is_completed)
       VALUES ($1, $2, $3, $4, $5)`,
      [1, 2, new Date('2026-07-11T15:00:00Z'), 'semifinals', false]
    );
    console.log('✓ Inserted 2 Semi Final matches');

    // Final
    await client.query(
      `INSERT INTO matches (team1_id, team2_id, match_date, round, is_completed)
       VALUES ($1, $2, $3, $4, $5)`,
      [1, 2, new Date('2026-07-15T18:00:00Z'), 'final', false]
    );
    console.log('✓ Inserted Final match');

    console.log('\n✅ Database initialization complete!');
    console.log(`Total matches created: ${matchCount + 16 + 8 + 2 + 1}`);
    
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run initialization
initializeDatabase()
  .then(() => {
    console.log('\nYou can now start the server with: npm start');
    process.exit(0);
  })
  .catch(error => {
    console.error('Initialization failed:', error);
    process.exit(1);
  });
