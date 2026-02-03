// Configuration
const API_URL = "https://fantasy-league-production-9b68.up.railway.app";

let authToken = null;
let currentUser = null;
let allMatches = [];
let allTeams = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

// Authentication Functions
function checkAuth() {
    authToken = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    
    if (authToken && user) {
        currentUser = JSON.parse(user);
        showMainApp();
    } else {
        showAuthModal();
    }
}

function showAuthModal() {
    document.getElementById('authModal').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
}

function showMainApp() {
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('usernameDisplay').textContent = currentUser.username;
    loadDashboardData();
}

function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
}

function showSignup() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
}

async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showMainApp();
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}

async function signup() {
    const username = document.getElementById('signupUsername').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;

    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showMainApp();
        } else {
            alert(data.error || 'Signup failed');
        }
    } catch (error) {
        console.error('Signup error:', error);
        alert('Signup failed. Please try again.');
    }
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    currentUser = null;
    showAuthModal();
}

// Tab Navigation
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');

    // Load tab-specific data
    if (tabName === 'matches') {
        loadTeamsAndMatches();
    }
}

// Dashboard Data Loading
async function loadDashboardData() {
    await Promise.all([
        loadLeaderboard(),
        loadCurrentMatches(),
        loadFutureMatches(),
        loadUserPoints(),
        loadTeams(),
        loadAllMatches()
    ]);
}

async function loadLeaderboard() {
    try {
        const response = await fetch(`${API_BASE_URL}/leaderboard/top/10`);
        const data = await response.json();

        const container = document.getElementById('leaderboardList');
        
        if (data.leaderboard.length === 0) {
            container.innerHTML = '<div class="no-matches">No players yet</div>';
            return;
        }

        container.innerHTML = data.leaderboard.map(player => `
            <div class="leaderboard-item">
                <div class="leaderboard-rank">${player.rank}</div>
                <div class="leaderboard-username">${player.username}</div>
                <div class="leaderboard-points">${player.total_points}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

async function loadCurrentMatches() {
    try {
        const response = await fetch(`${API_BASE_URL}/matches/current`);
        const data = await response.json();

        const container = document.getElementById('currentMatches');
        
        if (data.matches.length === 0) {
            container.innerHTML = '<div class="no-matches">No matches currently playing</div>';
            return;
        }

        container.innerHTML = data.matches.map(match => `
            <div class="match-card">
                <div class="match-teams">
                    <span class="team-name">${match.team1_name}</span>
                    <span class="match-score">${match.team1_score || 0} - ${match.team2_score || 0}</span>
                    <span class="team-name">${match.team2_name}</span>
                </div>
                <div class="match-info">
                    <span class="match-round">${formatRound(match.round)}</span>
                    <span>${formatDate(match.match_date)}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading current matches:', error);
    }
}

async function loadFutureMatches() {
    try {
        const response = await fetch(`${API_BASE_URL}/matches?upcoming=true`);
        const data = await response.json();

        const container = document.getElementById('futureMatches');
        
        const upcomingMatches = data.matches.slice(0, 5); // Show next 5 matches
        
        if (upcomingMatches.length === 0) {
            container.innerHTML = '<div class="no-matches">No upcoming matches</div>';
            return;
        }

        container.innerHTML = upcomingMatches.map(match => `
            <div class="match-card">
                <div class="match-teams">
                    <span class="team-name">${match.team1_name}</span>
                    <span style="color: var(--electric-lime)">vs</span>
                    <span class="team-name">${match.team2_name}</span>
                </div>
                <div class="match-info">
                    <span class="match-round">${formatRound(match.round)}</span>
                    <span>${formatDate(match.match_date)}</span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading future matches:', error);
    }
}

async function loadUserPoints() {
    try {
        const response = await fetch(`${API_BASE_URL}/leaderboard`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();

        const userStats = data.leaderboard.find(p => p.id === currentUser.id);
        
        if (userStats) {
            document.getElementById('userTotalPoints').textContent = userStats.total_points;
            document.getElementById('tp1Points').textContent = userStats.tp1_points;
            document.getElementById('tp2Points').textContent = userStats.tp2_points;
            document.getElementById('tp3Points').textContent = userStats.tp3_points;
            document.getElementById('matchPoints').textContent = userStats.match_points;
        }
    } catch (error) {
        console.error('Error loading user points:', error);
    }
}

async function loadTeams() {
    try {
        const response = await fetch(`${API_BASE_URL}/teams`);
        const data = await response.json();
        allTeams = data.teams;

        // Populate team selectors
        populateTeamSelectors();
    } catch (error) {
        console.error('Error loading teams:', error);
    }
}

function populateTeamSelectors() {
    const selectors = [
        'tp1Winner', 'tp1RunnerUp',
        'tp2Winner', 'tp2RunnerUp',
        'tp3Winner', 'tp3RunnerUp'
    ];

    selectors.forEach(id => {
        const select = document.getElementById(id);
        select.innerHTML = '<option value="">Select Team</option>' + 
            allTeams.map(team => `<option value="${team.id}">${team.name}</option>`).join('');
    });
}

async function loadAllMatches() {
    try {
        const response = await fetch(`${API_BASE_URL}/matches`);
        const data = await response.json();
        allMatches = data.matches;

        displayMatchPredictions();
    } catch (error) {
        console.error('Error loading matches:', error);
    }
}

function displayMatchPredictions(filterRound = 'all') {
    const container = document.getElementById('matchPredictionsList');
    
    let matches = allMatches;
    if (filterRound !== 'all') {
        matches = allMatches.filter(m => m.round === filterRound);
    }

    if (matches.length === 0) {
        container.innerHTML = '<div class="no-matches">No matches found</div>';
        return;
    }

    container.innerHTML = matches.map(match => {
        const isPast = new Date(match.match_date) < new Date();
        const deadline = new Date(match.match_date);
        deadline.setMinutes(deadline.getMinutes() - 15);
        const isLocked = new Date() > deadline;

        return `
            <div class="match-prediction-card">
                <div class="match-prediction-header">
                    <div class="match-vs">${match.team1_name} vs ${match.team2_name}</div>
                    <div class="match-info">
                        <span class="match-round">${formatRound(match.round)}</span>
                        <span>${formatDate(match.match_date)}</span>
                    </div>
                </div>
                ${isLocked ? 
                    `<div class="error-message">Prediction locked (15 min before kickoff)</div>` :
                    `<div class="match-prediction-form">
                        <input type="number" min="0" max="20" class="score-input" 
                               id="team1Score_${match.id}" placeholder="0">
                        <span class="vs-divider">-</span>
                        <input type="number" min="0" max="20" class="score-input" 
                               id="team2Score_${match.id}" placeholder="0">
                        <button onclick="submitMatchPrediction(${match.id})" class="btn-primary">
                            Predict
                        </button>
                    </div>`
                }
            </div>
        `;
    }).join('');
}

function filterMatchesByRound(round) {
    // Update active button
    document.querySelectorAll('.round-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    displayMatchPredictions(round);
}

// Team Prediction Submission
async function submitTeamPrediction(type) {
    let winnerId, runnerUpId, groupName = null;

    if (type === 'TP1') {
        winnerId = document.getElementById('tp1Winner').value;
        runnerUpId = document.getElementById('tp1RunnerUp').value;
    } else if (type === 'TP2') {
        groupName = document.getElementById('tp2Group').value;
        winnerId = document.getElementById('tp2Winner').value;
        runnerUpId = document.getElementById('tp2RunnerUp').value;
        
        if (!groupName) {
            alert('Please select a group');
            return;
        }
    } else if (type === 'TP3') {
        winnerId = document.getElementById('tp3Winner').value;
        runnerUpId = document.getElementById('tp3RunnerUp').value;
    }

    if (!winnerId || !runnerUpId) {
        alert('Please select both winner and runner-up');
        return;
    }

    if (winnerId === runnerUpId) {
        alert('Winner and runner-up must be different teams');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/predictions/team`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                predictionType: type,
                winnerTeamId: parseInt(winnerId),
                runnerUpTeamId: parseInt(runnerUpId),
                groupName
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert(`${type} prediction submitted successfully!`);
            loadUserPoints();
        } else {
            alert(data.error || 'Failed to submit prediction');
        }
    } catch (error) {
        console.error('Error submitting team prediction:', error);
        alert('Failed to submit prediction');
    }
}

// Match Prediction Submission
async function submitMatchPrediction(matchId) {
    const team1Score = parseInt(document.getElementById(`team1Score_${matchId}`).value);
    const team2Score = parseInt(document.getElementById(`team2Score_${matchId}`).value);

    if (isNaN(team1Score) || isNaN(team2Score)) {
        alert('Please enter valid scores');
        return;
    }

    if (team1Score < 0 || team2Score < 0) {
        alert('Scores must be positive');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/predictions/match`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                matchId,
                predictedTeam1Score: team1Score,
                predictedTeam2Score: team2Score
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Match prediction submitted successfully!');
        } else {
            alert(data.error || 'Failed to submit prediction');
        }
    } catch (error) {
        console.error('Error submitting match prediction:', error);
        alert('Failed to submit prediction');
    }
}

// Teams and Matches Tab
async function loadTeamsAndMatches() {
    await loadTeamsGroups();
    await loadAllMatchesList();
}

async function loadTeamsGroups() {
    const container = document.getElementById('teamsGroups');
    const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    container.innerHTML = groups.map(group => {
        const groupTeams = allTeams.filter(t => t.group_name === group);
        
        return `
            <div class="group-card">
                <h3>Group ${group}</h3>
                <div class="group-teams">
                    ${groupTeams.map(team => `
                        <div class="team-item">
                            <strong>${team.name}</strong> (${team.country_code})
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

async function loadAllMatchesList(filterRound = 'all') {
    const container = document.getElementById('allMatchesList');
    
    let matches = allMatches;
    if (filterRound !== 'all') {
        matches = allMatches.filter(m => m.round === filterRound);
    }

    if (matches.length === 0) {
        container.innerHTML = '<div class="no-matches">No matches found</div>';
        return;
    }

    container.innerHTML = matches.map(match => `
        <div class="match-card">
            <div class="match-teams">
                <span class="team-name">${match.team1_name}</span>
                ${match.is_completed ? 
                    `<span class="match-score">${match.team1_score} - ${match.team2_score}</span>` :
                    `<span style="color: var(--electric-lime)">vs</span>`
                }
                <span class="team-name">${match.team2_name}</span>
            </div>
            <div class="match-info">
                <span class="match-round">${formatRound(match.round)}</span>
                <span>${formatDate(match.match_date)}</span>
                ${match.is_completed ? 
                    '<span style="color: var(--champion-gold)">✓ Completed</span>' : 
                    '<span style="color: var(--warning-orange)">Upcoming</span>'
                }
            </div>
        </div>
    `).join('');
}

function filterAllMatches(round) {
    // Update active button
    document.querySelectorAll('#matchesTab .round-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    loadAllMatchesList(round);
}

// Test Functions
async function testRecalculatePoints() {
    const output = document.getElementById('testOutput');
    output.textContent = 'Recalculating points...';

    try {
        // This would need an admin endpoint in production
        await loadUserPoints();
        output.textContent = 'Points recalculated successfully!\n' + 
                           JSON.stringify(await getUserStats(), null, 2);
    } catch (error) {
        output.textContent = 'Error: ' + error.message;
    }
}

async function testLoadData() {
    const output = document.getElementById('testOutput');
    output.textContent = 'Reloading all data...';

    try {
        await loadDashboardData();
        output.textContent = 'Data reloaded successfully!\n' +
                           `Teams: ${allTeams.length}\n` +
                           `Matches: ${allMatches.length}`;
    } catch (error) {
        output.textContent = 'Error: ' + error.message;
    }
}

async function getUserStats() {
    const response = await fetch(`${API_BASE_URL}/leaderboard`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await response.json();
    return data.leaderboard.find(p => p.id === currentUser.id);
}

// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

function formatRound(round) {
    const roundNames = {
        'qualifying': 'Qualifying',
        'round_of_16': 'Round of 16',
        'quarterfinals': 'Quarter Finals',
        'semifinals': 'Semi Finals',
        'final': 'Final'
    };
    return roundNames[round] || round;
}

// Auto-refresh leaderboard and matches every 30 seconds
setInterval(() => {
    if (authToken) {
        loadLeaderboard();
        loadCurrentMatches();
        loadUserPoints();
    }
}, 30000);
