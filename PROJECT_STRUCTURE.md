# Project Structure

```
fantasy-league/
│
├── README.md                          # Comprehensive documentation
├── QUICKSTART.md                      # 10-minute setup guide
├── .gitignore                         # Git ignore rules
│
├── database/
│   └── schema.sql                     # Database schema definition
│
├── backend/                           # Node.js/Express API
│   ├── package.json                   # Dependencies and scripts
│   ├── .env.example                   # Environment variables template
│   ├── server.js                      # Main Express server
│   ├── db.js                          # Database connection pool
│   │
│   ├── middleware/
│   │   └── auth.js                    # JWT authentication middleware
│   │
│   ├── routes/
│   │   ├── auth.js                    # Authentication endpoints
│   │   ├── predictions.js             # Prediction endpoints
│   │   ├── matches.js                 # Match endpoints
│   │   ├── teams.js                   # Team endpoints
│   │   └── leaderboard.js             # Leaderboard endpoints
│   │
│   ├── services/
│   │   └── scoring.js                 # Scoring calculation engine
│   │
│   └── scripts/
│       ├── init-db.js                 # Database initialization with sample data
│       └── admin-utils.js             # Admin command-line utilities
│
└── frontend/                          # Static web application
    ├── index.html                     # Main HTML structure
    ├── styles.css                     # Stadium-themed styling
    └── app.js                         # Application logic and API calls
```

## Key Files Description

### Backend Files

**server.js**
- Main Express application
- Configures middleware (CORS, JSON parsing)
- Mounts all route handlers
- Error handling

**db.js**
- PostgreSQL connection pool
- Configured for 20 max connections
- Connection management

**routes/**
- `auth.js`: Signup, login with JWT
- `predictions.js`: Submit/view team and match predictions
- `matches.js`: Get matches, filter by round/status
- `teams.js`: Get teams by group
- `leaderboard.js`: Rankings and user stats

**services/scoring.js**
- Complex scoring calculations
- TP1/TP2/TP3 points computation
- Match prediction points (varying by round)
- Multiplier handling (Double Up, Re-Double Up)
- Batch recalculation for all users

**scripts/**
- `init-db.js`: Creates schema and inserts sample data
- `admin-utils.js`: CLI tools for match updates and stats

### Frontend Files

**index.html**
- Single-page application structure
- Four tabs: Predictions, Teams/Matches, Test, About
- Authentication modal
- Responsive grid layouts

**styles.css**
- Custom stadium-inspired theme
- CSS variables for consistency
- Responsive design with mobile support
- Animations and transitions

**app.js**
- Vanilla JavaScript (no frameworks)
- API integration with backend
- State management via localStorage
- Auto-refresh for leaderboard
- Form handling and validation

### Database

**schema.sql**
- 7 tables: users, teams, matches, team_predictions, match_predictions, multipliers, user_points
- Proper indexes for performance
- Foreign key relationships
- Optimized for 100 concurrent users

## API Endpoints

### Authentication
- POST `/api/auth/signup` - Create account
- POST `/api/auth/login` - Authenticate user

### Predictions (Protected)
- POST `/api/predictions/team` - Submit TP1/TP2/TP3
- POST `/api/predictions/match` - Predict match outcome
- GET `/api/predictions/user` - Get all user predictions
- POST `/api/predictions/multiplier` - Activate Double Up/Re-Double Up

### Matches (Public)
- GET `/api/matches` - All matches (filter by round/upcoming)
- GET `/api/matches/current` - Currently playing matches
- GET `/api/matches/:id` - Single match details

### Teams (Public)
- GET `/api/teams` - All teams (filter by group)
- GET `/api/teams/:id` - Single team
- GET `/api/teams/group/:groupName` - Teams in group

### Leaderboard (Public)
- GET `/api/leaderboard` - Full rankings
- GET `/api/leaderboard/top/:limit` - Top N players

## Data Flow

1. **User Signs Up** → `auth.js` → Creates user in DB → Returns JWT
2. **User Logs In** → `auth.js` → Validates credentials → Returns JWT
3. **User Makes Prediction** → `predictions.js` → Validates deadline → Saves to DB
4. **Match Completes** → Admin updates score → `scoring.js` recalculates → Updates user_points
5. **User Views Leaderboard** → `leaderboard.js` → Queries user_points → Returns ranked list

## Security Features

- Passwords hashed with bcryptjs (10 rounds)
- JWT tokens for stateless authentication
- Input validation with express-validator
- SQL injection prevention via parameterized queries
- CORS configuration for API security
- Environment variables for sensitive config

## Performance Optimizations

- Database connection pooling (20 connections)
- Indexes on frequently queried columns
- Cached user points in dedicated table
- Lightweight frontend (no heavy frameworks)
- Pagination ready (top N queries)
- Efficient SQL queries with JOINs

## Scalability Notes

Current architecture supports 100 concurrent users efficiently. For scaling:

- **100-500 users**: Increase connection pool, add Redis cache
- **500-1000 users**: Add read replicas, CDN for frontend
- **1000+ users**: Microservices, load balancer, separate scoring service

## Development Workflow

1. **Make changes** to backend or frontend
2. **Test locally** with development server
3. **Update database** if schema changes
4. **Run admin-utils** to verify data
5. **Deploy** to production server

## Deployment Checklist

- [ ] Set production environment variables
- [ ] Change JWT_SECRET to secure random string
- [ ] Initialize production database
- [ ] Configure Nginx/Apache reverse proxy
- [ ] Set up SSL certificate
- [ ] Configure PM2 for process management
- [ ] Set up automated backups
- [ ] Monitor logs and performance
- [ ] Test all endpoints in production
- [ ] Share URL with league participants

## Maintenance Tasks

**Daily**
- Monitor server logs
- Check for errors

**Weekly**
- Update match scores
- Review leaderboard
- Backup database

**After Matches**
- Update scores in database
- Recalculate points
- Verify leaderboard accuracy

**End of Tournament**
- Archive final standings
- Export user statistics
- Celebrate the winner! 🏆
