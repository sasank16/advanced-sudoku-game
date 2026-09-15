/**
 * Game Controller
 * Manages game lifecycle, move validation, intelligent hints, and completion scoring.
 */

const Game = require('../models/Game');
const User = require('../models/User');
const MemoryStore = require('../services/memoryStore');
const { generatePuzzle } = require('../services/sudokuGenerator');
const { isSolvedBoardValid, isBoardComplete, cloneBoard } = require('../services/sudokuValidator');
const { getIntelligentHint } = require('../services/hintEngine');
const { calculateScore, getDifficultySettings } = require('../services/difficulty');
const { getIsConnected } = require('../config/db');

// Helper to fetch raw game with solution
async function fetchGameWithSolution(gameId) {
  if (getIsConnected()) {
    return Game.findById(gameId).select('+solution');
  } else {
    return MemoryStore.getRawGameById(gameId);
  }
}

// POST /api/games
async function createGame(req, res, next) {
  try {
    const { difficulty = 'medium', guestId = null } = req.body;
    const validDifficulties = ['easy', 'medium', 'hard', 'expert'];
    const diff = validDifficulties.includes(String(difficulty).toLowerCase()) 
      ? String(difficulty).toLowerCase() 
      : 'medium';

    // Generate puzzle and solution using the engine
    const { puzzle, solution, cluesCount } = generatePuzzle(diff);

    const initialBoard = cloneBoard(puzzle);
    const userId = req.user ? req.user._id : null;

    let game;
    if (getIsConnected()) {
      game = await Game.create({
        userId,
        guestId,
        difficulty: diff,
        puzzle,
        currentBoard: initialBoard,
        solution,
        maxMistakes: req.user?.preferences?.maxMistakesLimit || 3,
        status: 'playing'
      });
      game = game.toPublicJSON();
    } else {
      game = await MemoryStore.createGame({
        userId,
        guestId,
        difficulty: diff,
        puzzle,
        currentBoard: initialBoard,
        solution,
        maxMistakes: req.user?.preferences?.maxMistakesLimit || 3
      });
      game = game.toPublicJSON();
    }

    return res.status(201).json({
      success: true,
      message: 'New game created successfully.',
      game: {
        id: game._id || game.id,
        difficulty: game.difficulty,
        puzzle: game.puzzle,
        currentBoard: game.currentBoard,
        pencilMarks: game.pencilMarks,
        mistakes: game.mistakes,
        maxMistakes: game.maxMistakes,
        hintsUsed: game.hintsUsed,
        score: game.score,
        elapsedTime: game.elapsedTime,
        status: game.status,
        cluesCount
      }
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/games/:id
async function getGame(req, res, next) {
  try {
    const { id } = req.params;
    let game;

    if (getIsConnected()) {
      game = await Game.findById(id);
      if (!game) {
        return res.status(404).json({ success: false, message: 'Game not found.' });
      }
      game = game.toPublicJSON();
    } else {
      game = await MemoryStore.findGameById(id, false);
      if (!game) {
        return res.status(404).json({ success: false, message: 'Game not found.' });
      }
    }

    return res.json({
      success: true,
      game
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/games/:id/move
async function makeMove(req, res, next) {
  try {
    const { id } = req.params;
    const { row, col, number } = req.body;

    if (row < 0 || row > 8 || col < 0 || col > 8) {
      return res.status(400).json({ success: false, message: 'Invalid cell position (row/col must be 0-8).' });
    }

    if (number < 0 || number > 9) {
      return res.status(400).json({ success: false, message: 'Invalid number (must be 0-9).' });
    }

    const game = await fetchGameWithSolution(id);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found.' });
    }

    if (game.status !== 'playing') {
      return res.status(400).json({ success: false, message: `Game is currently ${game.status}.` });
    }

    // Check if cell is a fixed puzzle clue
    if (game.puzzle[row][col] !== 0) {
      return res.status(400).json({ success: false, message: 'Cannot modify original puzzle clue cells.' });
    }

    const expectedNumber = game.solution[row][col];
    let isCorrect = true;
    let isErase = number === 0;

    if (!isErase) {
      isCorrect = (number === expectedNumber);
    }

    // Update board state
    const prevVal = game.currentBoard[row][col];
    game.currentBoard[row][col] = number;

    if (!isCorrect && !isErase) {
      game.mistakes = (game.mistakes || 0) + 1;
      if (game.mistakes >= game.maxMistakes) {
        game.status = 'failed';
      }
    }

    // Check for board completion
    let completed = false;
    if (isBoardComplete(game.currentBoard) && isSolvedBoardValid(game.currentBoard)) {
      completed = true;
      game.status = 'completed';
      game.completedAt = new Date();
    }

    if (getIsConnected()) {
      game.markModified('currentBoard');
      await game.save();
    } else {
      await MemoryStore.updateGame(id, {
        currentBoard: game.currentBoard,
        mistakes: game.mistakes,
        status: game.status,
        completedAt: game.completedAt
      });
    }

    return res.json({
      success: true,
      correct: isCorrect,
      expected: isCorrect ? number : undefined,
      mistakes: game.mistakes,
      maxMistakes: game.maxMistakes,
      status: game.status,
      completed,
      currentBoard: game.currentBoard
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/games/:id/hint
async function requestHint(req, res, next) {
  try {
    const { id } = req.params;
    const game = await fetchGameWithSolution(id);

    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found.' });
    }

    if (game.status !== 'playing') {
      return res.status(400).json({ success: false, message: `Cannot request hints when game is ${game.status}.` });
    }

    const hint = getIntelligentHint(game.currentBoard, game.solution);
    game.hintsUsed = (game.hintsUsed || 0) + 1;

    if (getIsConnected()) {
      await game.save();
    } else {
      await MemoryStore.updateGame(id, { hintsUsed: game.hintsUsed });
    }

    return res.json({
      success: true,
      hint,
      hintsUsed: game.hintsUsed
    });
  } catch (error) {
    next(error);
  }
}

// PUT /api/games/:id
async function saveGame(req, res, next) {
  try {
    const { id } = req.params;
    const { currentBoard, pencilMarks, elapsedTime, score, status } = req.body;

    const game = await fetchGameWithSolution(id);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found.' });
    }

    if (currentBoard) game.currentBoard = currentBoard;
    if (pencilMarks) game.pencilMarks = pencilMarks;
    if (typeof elapsedTime === 'number') game.elapsedTime = elapsedTime;
    if (typeof score === 'number') game.score = score;
    if (status) game.status = status;

    if (getIsConnected()) {
      game.markModified('currentBoard');
      game.markModified('pencilMarks');
      await game.save();
    } else {
      await MemoryStore.updateGame(id, {
        currentBoard: game.currentBoard,
        pencilMarks: game.pencilMarks,
        elapsedTime: game.elapsedTime,
        score: game.score,
        status: game.status
      });
    }

    return res.json({
      success: true,
      message: 'Game state saved successfully.'
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/games/:id/complete
async function completeGame(req, res, next) {
  try {
    const { id } = req.params;
    const { elapsedTime } = req.body;

    const game = await fetchGameWithSolution(id);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found.' });
    }

    // Verify full board validity
    const isComplete = isBoardComplete(game.currentBoard);
    const isValid = isSolvedBoardValid(game.currentBoard);

    if (!isComplete || !isValid) {
      return res.status(400).json({
        success: false,
        message: 'The board is not yet completely or correctly solved.'
      });
    }

    const playTime = typeof elapsedTime === 'number' ? elapsedTime : (game.elapsedTime || 0);
    const { finalScore, breakdown } = calculateScore({
      difficulty: game.difficulty,
      elapsedTime: playTime,
      mistakes: game.mistakes,
      hintsUsed: game.hintsUsed
    });

    game.status = 'completed';
    game.score = finalScore;
    game.elapsedTime = playTime;
    game.completedAt = new Date();

    if (getIsConnected()) {
      await game.save();
    } else {
      await MemoryStore.updateGame(id, {
        status: 'completed',
        score: finalScore,
        elapsedTime: playTime,
        completedAt: game.completedAt
      });
    }

    // Update User Stats if authenticated
    let userStats = null;
    const userId = game.userId || (req.user ? req.user._id : null);

    if (userId) {
      if (getIsConnected()) {
        const user = await User.findById(userId);
        if (user) {
          user.stats.gamesPlayed += 1;
          user.stats.gamesCompleted += 1;
          user.stats.gamesWon += 1;
          user.stats.totalScore += finalScore;
          user.stats.totalPlayTime += playTime;
          user.stats.totalMistakes += game.mistakes;
          user.stats.totalHintsUsed += game.hintsUsed;

          if (finalScore > user.stats.bestScore) {
            user.stats.bestScore = finalScore;
          }

          const diffKey = game.difficulty.toLowerCase();
          const currentBestTime = user.stats.bestTime[diffKey];
          if (currentBestTime === null || playTime < currentBestTime) {
            user.stats.bestTime[diffKey] = playTime;
          }

          user.markModified('stats');
          await user.save();
          userStats = user.stats;
        }
      } else {
        const user = await MemoryStore.findUserById(userId);
        if (user) {
          user.stats.gamesPlayed += 1;
          user.stats.gamesCompleted += 1;
          user.stats.gamesWon += 1;
          user.stats.totalScore += finalScore;
          user.stats.totalPlayTime += playTime;
          user.stats.totalMistakes += game.mistakes;
          user.stats.totalHintsUsed += game.hintsUsed;

          if (finalScore > user.stats.bestScore) {
            user.stats.bestScore = finalScore;
          }

          const diffKey = game.difficulty.toLowerCase();
          const currentBestTime = user.stats.bestTime[diffKey];
          if (currentBestTime === null || playTime < currentBestTime) {
            user.stats.bestTime[diffKey] = playTime;
          }

          await MemoryStore.updateUserStats(userId, user.stats);
          userStats = user.stats;
        }
      }
    }

    return res.json({
      success: true,
      message: 'Congratulations! Game completed successfully.',
      score: finalScore,
      breakdown,
      elapsedTime: playTime,
      mistakes: game.mistakes,
      hintsUsed: game.hintsUsed,
      userStats
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/games/:id
async function abandonGame(req, res, next) {
  try {
    const { id } = req.params;
    const game = await fetchGameWithSolution(id);

    if (!game) {
      return res.status(404).json({ success: false, message: 'Game not found.' });
    }

    game.status = 'abandoned';
    if (getIsConnected()) {
      await game.save();
    } else {
      await MemoryStore.updateGame(id, { status: 'abandoned' });
    }

    return res.json({
      success: true,
      message: 'Game abandoned.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createGame,
  getGame,
  makeMove,
  requestHint,
  saveGame,
  completeGame,
  abandonGame
};
