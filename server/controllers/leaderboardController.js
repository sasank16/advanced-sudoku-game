/**
 * Leaderboard Controller
 * Queries and delivers real completed game rankings.
 */

const Game = require('../models/Game');
const MemoryStore = require('../services/memoryStore');
const { getIsConnected } = require('../config/db');

// GET /api/leaderboard?difficulty=easy|medium|hard|expert&limit=20
async function getLeaderboard(req, res, next) {
  try {
    const { difficulty, limit = 20 } = req.query;
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    if (getIsConnected()) {
      const query = { status: 'completed' };
      if (difficulty) {
        query.difficulty = difficulty.toLowerCase();
      }

      const completedGames = await Game.find(query)
        .sort({ score: -1, elapsedTime: 1 })
        .limit(parsedLimit)
        .populate('userId', 'username');

      const leaderboard = completedGames.map(game => ({
        gameId: game._id,
        playerName: game.userId ? game.userId.username : 'Guest Player',
        difficulty: game.difficulty,
        score: game.score,
        elapsedTime: game.elapsedTime,
        mistakes: game.mistakes,
        hintsUsed: game.hintsUsed,
        completedAt: game.completedAt
      }));

      return res.json({
        success: true,
        count: leaderboard.length,
        leaderboard
      });
    } else {
      const leaderboard = await MemoryStore.getLeaderboard(difficulty, parsedLimit);
      return res.json({
        success: true,
        count: leaderboard.length,
        leaderboard
      });
    }
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getLeaderboard
};
