/**
 * Backend API Integration Test Suite
 * Validates endpoints without external dependencies.
 */

const http = require('http');
const app = require('../app');

let server;
let baseUrl;
let passed = 0;
let total = 0;

function assert(condition, msg) {
  total++;
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
  passed++;
  console.log(`✅ PASS: ${msg}`);
}

async function request(path, options = {}) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });
  const data = await response.json();
  return { status: response.status, data };
}

async function runApiTests() {
  console.log('====================================================');
  console.log('🚀 RUNNING REST API INTEGRATION TESTS');
  console.log('====================================================\n');

  // Start temporary server on 127.0.0.1
  await new Promise((resolve, reject) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`Test server bound to ${baseUrl}`);
      resolve();
    });
    server.on('error', reject);
  });

  try {
    // 1. Health check
    console.log('--- 1. Health Check ---');
    const health = await request('/api/health');
    assert(health.status === 200 && health.data.status === 'ok', 'GET /api/health returns 200 OK');

    // 2. Auth: Register
    console.log('\n--- 2. Auth: Registration & Login ---');
    const testUser = {
      username: `sudoku_master_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'SecurePassword123'
    };

    const reg = await request('/api/users/register', {
      method: 'POST',
      body: JSON.stringify(testUser)
    });
    assert(reg.status === 201 && reg.data.token, 'POST /api/users/register creates user and returns JWT');
    const token = reg.data.token;

    // Login
    const loginRes = await request('/api/users/login', {
      method: 'POST',
      body: JSON.stringify({ emailOrUsername: testUser.email, password: testUser.password })
    });
    assert(loginRes.status === 200 && loginRes.data.token, 'POST /api/users/login logs in user successfully');

    // Profile with JWT
    const profileRes = await request('/api/auth/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert(profileRes.status === 200 && profileRes.data.user.username === testUser.username, 'GET /api/auth/profile returns user details');

    // 3. Game Creation
    console.log('\n--- 3. Game Creation ---');
    const createRes = await request('/api/games', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ difficulty: 'medium' })
    });
    assert(createRes.status === 201 && createRes.data.game.id, 'POST /api/games creates new game');
    assert(createRes.data.game.solution === undefined, 'Solution is NOT exposed to client in API response');
    const gameId = createRes.data.game.id;
    const puzzle = createRes.data.game.puzzle;

    // 4. Get Game State
    console.log('\n--- 4. Get Game ---');
    const getRes = await request(`/api/games/${gameId}`);
    assert(getRes.status === 200 && getRes.data.game.id === gameId, 'GET /api/games/:id returns public game state');

    // 5. Intelligent Hint
    console.log('\n--- 5. Intelligent Hint ---');
    const hintRes = await request(`/api/games/${gameId}/hint`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    assert(hintRes.status === 200 && hintRes.data.hint.technique, 'POST /api/games/:id/hint returns structured explanation');

    // 6. Make Move & Fixed Cell Protection
    console.log('\n--- 6. Make Move & Validation ---');
    // Apply hint move
    const hintMove = await request(`/api/games/${gameId}/move`, {
      method: 'POST',
      body: JSON.stringify({
        row: hintRes.data.hint.row,
        col: hintRes.data.hint.col,
        number: hintRes.data.hint.number
      })
    });
    assert(hintMove.status === 200 && hintMove.data.correct === true, 'Move with hint value is recognized as correct');

    // Test fixed cell protection
    let fixedRow = 0, fixedCol = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (puzzle[r][c] !== 0) {
          fixedRow = r;
          fixedCol = c;
          break;
        }
      }
      if (puzzle[fixedRow][fixedCol] !== 0) break;
    }

    const fixedAttempt = await request(`/api/games/${gameId}/move`, {
      method: 'POST',
      body: JSON.stringify({
        row: fixedRow,
        col: fixedCol,
        number: 1
      })
    });
    assert(fixedAttempt.status === 400, 'Fixed puzzle cells cannot be modified (status 400)');

    // 7. Save State
    console.log('\n--- 7. Save Game State ---');
    const saveRes = await request(`/api/games/${gameId}`, {
      method: 'PUT',
      body: JSON.stringify({
        elapsedTime: 125,
        score: 250
      })
    });
    assert(saveRes.status === 200, 'PUT /api/games/:id successfully saves progress');

    // 8. Leaderboard
    console.log('\n--- 8. Leaderboard ---');
    const lbRes = await request('/api/leaderboard');
    assert(lbRes.status === 200 && Array.isArray(lbRes.data.leaderboard), 'GET /api/leaderboard returns leaderboard array');

    console.log('\n====================================================');
    console.log(`🎉 ALL ${passed}/${total} API INTEGRATION TESTS PASSED!`);
    console.log('====================================================\n');
  } finally {
    if (server) {
      server.close();
    }
  }
}

runApiTests().catch(err => {
  console.error('API Test Error:', err);
  if (server) server.close();
  process.exit(1);
});
