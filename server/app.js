/**
 * Express Application Setup
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const gameRoutes = require('./routes/gameRoutes');
const userRoutes = require('./routes/userRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const { notFoundHandler, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from /public
app.use(express.static(path.join(__dirname, '../public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Advanced Sudoku Game Backend'
  });
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authRoutes); // Aliased for /api/users/login and /api/users/register
app.use('/api/games', gameRoutes);
app.use('/api/user', userRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Catch-all for single-page fallback or unknown static routes
app.use('/api/*', notFoundHandler);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
