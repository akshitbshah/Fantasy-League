-- Fantasy Football League Database Schema
-- Optimized for 100 concurrent users

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Teams table (FIFA World Cup teams)
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country_code VARCHAR(3) NOT NULL,
    group_name VARCHAR(1), -- A, B, C, D, E, F, G, H
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Matches table
CREATE TABLE matches (
    id SERIAL PRIMARY KEY,
    team1_id INTEGER REFERENCES teams(id),
    team2_id INTEGER REFERENCES teams(id),
    match_date TIMESTAMP NOT NULL,
    round VARCHAR(50) NOT NULL, -- qualifying, round_of_16, quarterfinals, semifinals, final
    team1_score INTEGER,
    team2_score INTEGER,
    is_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Team predictions (TP1, TP2, TP3)
CREATE TABLE team_predictions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    prediction_type VARCHAR(10) NOT NULL, -- TP1, TP2, TP3
    winner_team_id INTEGER REFERENCES teams(id),
    runner_up_team_id INTEGER REFERENCES teams(id),
    group_name VARCHAR(1), -- For TP2 only
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, prediction_type, group_name)
);

-- Match predictions
CREATE TABLE match_predictions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    match_id INTEGER REFERENCES matches(id),
    predicted_team1_score INTEGER NOT NULL,
    predicted_team2_score INTEGER NOT NULL,
    predicted_winner VARCHAR(10), -- team1, team2, draw
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, match_id)
);

-- Multipliers table (Double Up and Re-Double Up)
CREATE TABLE multipliers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    team_id INTEGER REFERENCES teams(id),
    multiplier_type VARCHAR(20) NOT NULL, -- double_up, re_double_up
    is_active BOOLEAN DEFAULT FALSE,
    activated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, team_id, multiplier_type)
);

-- User points tracking
CREATE TABLE user_points (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) UNIQUE,
    total_points INTEGER DEFAULT 0,
    tp1_points INTEGER DEFAULT 0,
    tp2_points INTEGER DEFAULT 0,
    tp3_points INTEGER DEFAULT 0,
    match_points INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_matches_date ON matches(match_date);
CREATE INDEX idx_matches_round ON matches(round);
CREATE INDEX idx_match_predictions_user ON match_predictions(user_id);
CREATE INDEX idx_match_predictions_match ON match_predictions(match_id);
CREATE INDEX idx_user_points_total ON user_points(total_points DESC);
CREATE INDEX idx_teams_group ON teams(group_name);
