# Quick Start Guide - Fantasy Football League

Get your fantasy league running in 10 minutes!

## Prerequisites Checklist

- [ ] Node.js installed (v14+)
- [ ] PostgreSQL installed (v12+)
- [ ] Terminal/Command prompt access

## Step-by-Step Setup

### 1️⃣ Database Setup (2 minutes)

Open PostgreSQL terminal (psql) or use pgAdmin:

```sql
CREATE DATABASE fantasy_league;
CREATE USER fantasy_user WITH PASSWORD 'password123';
GRANT ALL PRIVILEGES ON DATABASE fantasy_league TO fantasy_user;
\q
```

### 2️⃣ Backend Setup (3 minutes)

```bash
# Navigate to backend directory
cd fantasy-league/backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your database password
# (Use nano, vim, or any text editor)
nano .env

# Initialize database with teams and matches
npm run init-db

# Start the server
npm start
```

✅ Backend should now be running on `http://localhost:3000`

### 3️⃣ Frontend Setup (2 minutes)

Open a NEW terminal window:

```bash
# Navigate to frontend directory
cd fantasy-league/frontend

# Install a simple HTTP server
npm install -g http-server

# Start the frontend
http-server -p 8080
```

✅ Frontend should now be running on `http://localhost:8080`

### 4️⃣ Test the Application (3 minutes)

1. Open browser to `http://localhost:8080`
2. Click "Sign Up"
3. Create test account:
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `password123`
4. Explore the interface!

## Verification Steps

### Check Backend is Running

```bash
curl http://localhost:3000/health
```

Should return: `{"status":"OK","timestamp":"..."}`

### Check Frontend is Accessible

Open browser to: `http://localhost:8080`
Should see the "Friends Fantasy League" login page

### Check Database Connection

```bash
psql fantasy_league -U fantasy_user -c "SELECT COUNT(*) FROM teams;"
```

Should show: 48 teams

## Common Issues & Fixes

### ❌ "Cannot connect to database"
**Fix**: Check PostgreSQL is running
```bash
# On Mac/Linux
sudo systemctl start postgresql

# On Windows
# Start PostgreSQL from Services
```

### ❌ "Port 3000 already in use"
**Fix**: Change port in `.env`
```env
PORT=3001
```
Also update frontend `app.js` API_BASE_URL to match

### ❌ "CORS error in browser"
**Fix**: Make sure backend is running and CORS is enabled (it should be by default)

### ❌ "Teams not loading"
**Fix**: Run database initialization again
```bash
cd backend
npm run init-db
```

## Next Steps

1. **Customize Teams**: Edit `backend/scripts/init-db.js` with actual World Cup teams
2. **Set Match Dates**: Update match dates for your tournament
3. **Invite Friends**: Share the URL with your league participants
4. **Monitor Leaderboard**: Watch the competition unfold!

## Admin Tasks

### Update a Match Score

```sql
-- Connect to database
psql fantasy_league -U fantasy_user

-- Update match result
UPDATE matches 
SET team1_score = 3, 
    team2_score = 1, 
    is_completed = true 
WHERE id = 1;
```

### View All Predictions

```sql
SELECT u.username, mp.predicted_team1_score, mp.predicted_team2_score
FROM match_predictions mp
JOIN users u ON mp.user_id = u.id
WHERE mp.match_id = 1;
```

## Production Deployment

For deploying to a live server, see the main README.md file for detailed instructions on:
- Setting up on a VPS
- Configuring Nginx
- SSL certificates
- PM2 process management
- Security best practices

## Support

If you run into issues:
1. Check the main README.md
2. Review error messages in terminal
3. Check browser console (F12)
4. Verify database connection

## Success! 🎉

Your fantasy league is now running! Users can:
- ✅ Sign up and login
- ✅ Make team predictions (TP1, TP2, TP3)
- ✅ Predict match outcomes
- ✅ View live leaderboard
- ✅ Track their points

**Enjoy the tournament! ⚽**
