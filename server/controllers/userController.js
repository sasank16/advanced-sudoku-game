/**
 * User Controller
 * Provides user statistics and preferences updates.
 */

const User = require('../models/User');
const MemoryStore = require('../services/memoryStore');
const { getIsConnected } = require('../config/db');

// GET /api/users/statistics
async function getStatistics(req, res, next) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const stats = user.stats || {};
    const winRate = stats.gamesPlayed > 0 
      ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) 
      : 0;

    return res.json({
      success: true,
      stats: {
        ...stats,
        winRate,
        username: user.username
      }
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/users/preferences
async function updatePreferences(req, res, next) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const allowed = [
      'theme',
      'soundEffects',
      'highlightDuplicates',
      'highlightSameNumbers',
      'highlightRelated',
      'autoRemoveCandidates',
      'maxMistakesLimit'
    ];

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        user.preferences[key] = req.body[key];
      }
    }

    if (getIsConnected()) {
      user.markModified('preferences');
      await user.save();
    }

    return res.json({
      success: true,
      message: 'Preferences updated.',
      preferences: user.preferences
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getStatistics,
  updatePreferences
};
