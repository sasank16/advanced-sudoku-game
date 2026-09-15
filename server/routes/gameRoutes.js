/**
 * Game Routes
 */

const express = require('express');
const router = express.Router();
const {
  createGame,
  getGame,
  makeMove,
  requestHint,
  saveGame,
  completeGame,
  abandonGame
} = require('../controllers/gameController');
const { optionalAuth } = require('../middleware/authMiddleware');

router.post('/', optionalAuth, createGame);
router.get('/:id', optionalAuth, getGame);
router.post('/:id/move', optionalAuth, makeMove);
router.post('/:id/hint', optionalAuth, requestHint);
router.put('/:id', optionalAuth, saveGame);
router.post('/:id/complete', optionalAuth, completeGame);
router.delete('/:id', optionalAuth, abandonGame);

module.exports = router;
