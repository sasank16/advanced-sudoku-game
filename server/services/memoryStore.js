/**
 * In-memory Store Fallback
 * Provides storage when MongoDB is not connected in the local environment.
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const memoryUsers = new Map();
const memoryGames = new Map();

const MemoryStore = {
  // Users
  async findUserByEmail(email) {
    for (const user of memoryUsers.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return user;
      }
    }
    return null;
  },

  async findUserByUsername(username) {
    for (const user of memoryUsers.values()) {
      if (user.username.toLowerCase() === username.toLowerCase()) {
        return user;
      }
    }
    return null;
  },

  async findUserById(id) {
    return memoryUsers.get(String(id)) || null;
  },

  async createUser({ username, email, password }) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const id = crypto.randomUUID();

    const user = {
      _id: id,
      id,
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      stats: {
        gamesPlayed: 0,
        gamesCompleted: 0,
        gamesWon: 0,
        totalScore: 0,
        bestScore: 0,
        totalPlayTime: 0,
        bestTime: {
          easy: null,
          medium: null,
          hard: null,
          expert: null
        },
        totalMistakes: 0,
        totalHintsUsed: 0
      },
      preferences: {
        theme: 'dark',
        soundEffects: true,
        highlightDuplicates: true,
        highlightSameNumbers: true,
        highlightRelated: true,
        autoRemoveCandidates: true,
        maxMistakesLimit: 3
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      async comparePassword(candidate) {
        return bcrypt.compare(candidate, this.password);
      },
      toSafeObject() {
        const copy = { ...this };
        delete copy.password;
        return copy;
      }
    };

    memoryUsers.set(id, user);
    return user;
  },

  async updateUserStats(userId, statsUpdate) {
    const user = memoryUsers.get(String(userId));
    if (!user) return null;
    Object.assign(user.stats, statsUpdate);
    user.updatedAt = new Date();
    return user;
  },

  // Games
  async createGame(gameData) {
    const id = crypto.randomUUID();
    const game = {
      _id: id,
      id,
      userId: gameData.userId || null,
      guestId: gameData.guestId || null,
      difficulty: gameData.difficulty,
      puzzle: gameData.puzzle,
      currentBoard: gameData.currentBoard,
      solution: gameData.solution,
      pencilMarks: gameData.pencilMarks || Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => [])),
      moveHistory: [],
      mistakes: 0,
      maxMistakes: gameData.maxMistakes || 3,
      hintsUsed: 0,
      score: 0,
      elapsedTime: 0,
      status: 'playing',
      startedAt: new Date(),
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      toPublicJSON() {
        const copy = { ...this };
        delete copy.solution;
        return copy;
      }
    };
    memoryGames.set(id, game);
    return game;
  },

  async findGameById(id, includeSolution = false) {
    const game = memoryGames.get(String(id));
    if (!game) return null;
    if (includeSolution) return game;
    return game.toPublicJSON();
  },

  async getRawGameById(id) {
    return memoryGames.get(String(id)) || null;
  },

  async updateGame(id, updateData) {
    const game = memoryGames.get(String(id));
    if (!game) return null;
    Object.assign(game, updateData, { updatedAt: new Date() });
    return game;
  },

  async getLeaderboard(difficulty = null, limit = 20) {
    const completedGames = [];
    for (const game of memoryGames.values()) {
      if (game.status === 'completed') {
        if (!difficulty || game.difficulty === difficulty.toLowerCase()) {
          let playerName = 'Guest Player';
          if (game.userId) {
            const u = memoryUsers.get(String(game.userId));
            if (u) playerName = u.username;
          }
          completedGames.push({
            gameId: game._id,
            playerName,
            difficulty: game.difficulty,
            score: game.score,
            elapsedTime: game.elapsedTime,
            mistakes: game.mistakes,
            hintsUsed: game.hintsUsed,
            completedAt: game.completedAt
          });
        }
      }
    }

    completedGames.sort((a, b) => b.score - a.score || a.elapsedTime - b.elapsedTime);
    return completedGames.slice(0, limit);
  }
};

module.exports = MemoryStore;
