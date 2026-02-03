# Friends Fantasy League - FIFA World Cup 2026

A complete fantasy football prediction league web application for FIFA World Cup tournaments. Built for up to 100 concurrent users with a straightforward, maintainable architecture.

## 🎯 Features

- **User Authentication**: Secure email/password signup and login
- **Team Predictions**: TP1 (Tournament Winner), TP2 (Group Leaders), TP3 (Second Chance)
- **Match Predictions**: Predict outcomes and exact scores for all matches
- **Scoring System**: Complex point calculation with multipliers (Double Up, Re-Double Up)
- **Live Leaderboard**: Real-time rankings updated automatically
- **Deadline Enforcement**: Predictions locked 15 minutes before kickoff
- **Responsive Design**: Works on desktop and mobile devices

## 🛠 Technology Stack

### Backend
- **Node.js** with Express.js
- **PostgreSQL** database
- **JWT** for authentication
- **bcryptjs** for password hashing

### Frontend
- **Vanilla JavaScript** (no framework overhead)
- **Modern CSS** with custom properties
- **Responsive design** with mobile support

## 📋 Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn package manager

## 🚀 Installation & Setup

### 1. Clone/Extract the Project

```bash
cd fantasy-league
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Set Up PostgreSQL Database

Create a new PostgreSQL database:

```sql
CREATE DATABASE fantasy_league;
CREATE USER fantasy_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE fantasy_league TO fantasy_user;
```

### 4. Configure Environment Variables

Copy the example environment file and edit it:

```bash
cp .env.example .env
```

Edit `.env` with your database credentials and settings:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fantasy_league
DB_USER=fantasy_user
DB_PASSWORD=your_secure_password

PORT=3000
NODE_ENV=development

JWT_SECRET=your_very_long_random_secret_key_change_this
PREDICTION_DEADLINE_MINUTES=15
```

**Important**: Change `JWT_SECRET` to a secure random string in production!

### 5. Initialize Database

Run the database initialization script to create tables and sample data:

```bash
npm run init-db
```

This will:
- Create all database tables
- Insert 48 sample teams (FIFA World Cup 2026 format)
- Create sample matches for all tournament rounds
- Set up the complete schema

### 6. Start the Backend Server

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

The API will be running at `http://localhost:3000`

### 7. Set Up Frontend

The frontend is static HTML/CSS/JS files. You can serve them using:

#### Option A: Simple HTTP Server (Development)

```bash
cd ../frontend
npx http-server -p 8080
```

Then open `http://localhost:8080` in your browser.

#### Option B: Nginx (Production)

Copy frontend files to your web server directory:

```bash
sudo cp -r frontend/* /var/www/html/fantasy-league/
```

Configure Nginx (example):

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/html/fantasy-league;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📊 Database Schema

The application uses 7 main tables:

- **users**: User accounts and authentication
- **teams**: FIFA World Cup teams with group assignments
- **matches**: All tournament matches with scores
- **team_predictions**: TP1, TP2, TP3 predictions
- **match_predictions**: Individual match outcome predictions
- **multipliers**: Double Up and Re-Double Up tracking
- **user_points**: Calculated points for each user

## 🎮 Using the Application

### For Users

1. **Sign Up**: Create an account with email, username, and password
2. **Make Predictions**:
   - Submit TP1 predictions (tournament winner/runner-up)
   - Submit TP2 predictions for each group
   - Predict match outcomes before the 15-minute deadline
3. **Activate Multipliers**:
   - Double Up: If your team has < 6 points after 2 games
   - Re-Double Up: After qualifying rounds end
4. **Track Progress**: View leaderboard and your total points

### For Administrators

#### Update Match Scores

To update a match result and trigger point recalculation:

```sql
-- Update match score
UPDATE matches 
SET team1_score = 2, 
    team2_score = 1, 
    is_completed = true 
WHERE id = 1;

-- Then trigger point recalculation (create admin endpoint or run manually)
```

#### Recalculate All Points

You can add an admin route or run this manually:

```javascript
const scoringService = require('./services/scoring');
await scoringService.recalculateAllPoints();
```

## 🔧 Customization

### Adjust Prediction Deadline

Edit `.env`:

```env
PREDICTION_DEADLINE_MINUTES=15  # Change to desired minutes
```

### Modify Scoring Rules

Edit `backend/services/scoring.js` to adjust:
- Point values for different rounds
- Team prediction bonuses
- Multiplier calculations

### Change Team Data

Edit teams in `backend/scripts/init-db.js` or directly in the database:

```sql
INSERT INTO teams (name, country_code, group_name) 
VALUES ('New Team', 'NTM', 'A');
```

### Add Match Data

```sql
INSERT INTO matches (team1_id, team2_id, match_date, round) 
VALUES (1, 2, '2026-06-15 15:00:00', 'qualifying');
```

## 🚢 Deployment to Production

### Using a VPS (Digital Ocean, AWS, etc.)

1. **Set up server** with Node.js and PostgreSQL
2. **Clone repository** to server
3. **Install dependencies**: `npm install`
4. **Set environment variables** in `.env` (use production values)
5. **Initialize database**: `npm run init-db`
6. **Use PM2** for process management:

```bash
npm install -g pm2
pm2 start server.js --name fantasy-league
pm2 startup
pm2 save
```

7. **Configure Nginx** as reverse proxy (see config above)
8. **Set up SSL** with Let's Encrypt:

```bash
sudo certbot --nginx -d your-domain.com
```

### Environment Variables for Production

```env
NODE_ENV=production
JWT_SECRET=very_long_random_string_minimum_32_characters
DB_HOST=your_db_host
DB_PASSWORD=strong_database_password
```

## 📈 Scaling for 100+ Users

The application is designed for 100 concurrent users with:

- **Connection pooling**: 20 max connections
- **Indexed queries**: All frequent queries use database indexes
- **Lightweight frontend**: No heavy frameworks
- **Efficient scoring**: Calculated on-demand, cached in user_points table

For more users:
1. Increase PostgreSQL `max_connections`
2. Add Redis caching for leaderboard
3. Use CDN for frontend assets
4. Consider database read replicas

## 🧪 Testing

### Test Endpoints

```bash
# Health check
curl http://localhost:3000/health

# Create user
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@test.com","password":"password123"}'

# Get leaderboard
curl http://localhost:3000/api/leaderboard
```

### Test Frontend

1. Open browser to frontend URL
2. Sign up with test account
3. Make some predictions
4. Check leaderboard updates

## 🐛 Troubleshooting

### Database Connection Errors

- Check PostgreSQL is running: `sudo systemctl status postgresql`
- Verify credentials in `.env`
- Check database exists: `psql -l`

### CORS Errors

- Ensure backend `cors()` middleware is enabled
- Check frontend API_BASE_URL matches backend

### Predictions Not Saving

- Check browser console for errors
- Verify JWT token is present in localStorage
- Check backend logs for validation errors

### Points Not Calculating

- Ensure matches have `is_completed = true`
- Run manual recalculation from Test tab
- Check scoring service logs

## 📝 API Documentation

### Authentication

- `POST /api/auth/signup` - Create new user
- `POST /api/auth/login` - Login user

### Predictions

- `POST /api/predictions/team` - Submit team prediction
- `POST /api/predictions/match` - Submit match prediction
- `GET /api/predictions/user` - Get user's predictions
- `POST /api/predictions/multiplier` - Activate multiplier

### Matches

- `GET /api/matches` - Get all matches
- `GET /api/matches/current` - Get live matches
- `GET /api/matches/:id` - Get specific match

### Teams

- `GET /api/teams` - Get all teams
- `GET /api/teams/group/:groupName` - Get teams by group

### Leaderboard

- `GET /api/leaderboard` - Get full leaderboard
- `GET /api/leaderboard/top/:limit` - Get top N players

## 📄 License

This project is for private use among friends. Not affiliated with FIFA.

## 🤝 Support

For issues or questions:
1. Check this README
2. Review backend logs
3. Check browser console
4. Verify database state

## 🎯 Prediction Rules Summary

### Team Predictions
- **TP1**: Tournament winner & runner-up (500 + 300 points)
- **TP2**: Group leaders & runner-ups (200 + 100 points per group)
- **TP3**: Second chance if TP1 team eliminated (500 + 300 points)

### Match Predictions
- Qualifying: 5 (outcome) / 25 (exact)
- Round of 16: 10 / 50
- Quarter Finals: 15 / 75
- Semi Finals: 20 / 100
- Final: 25 / 125

### Multipliers
- **Double Up**: 2x if team has <6 points after 2 games
- **Re-Double Up**: Additional 2x after qualifying rounds

## 🔮 Future Enhancements

Potential features to add:
- Email notifications for match deadlines
- Private leagues within the app
- Live match score updates
- Mobile app version
- Social sharing of predictions
- Historical statistics tracking
- Admin dashboard for match management
- Payment integration for entry fees (if needed)

---

**Built with ⚽ for Friends Fantasy League**
