/**
 * Game Model
 */

const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  guestId: {
    type: String,
    default: null
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'expert'],
    required: true
  },
  puzzle: {
    type: [[Number]],
    required: true
  },
  currentBoard: {
    type: [[Number]],
    required: true
  },
  solution: {
    type: [[Number]],
    required: true,
    select: false // Avoid sending solution in default queries
  },
  pencilMarks: {
    type: mongoose.Schema.Types.Mixed,
    default: () => Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []))
  },
  moveHistory: [
    {
      row: Number,
      col: Number,
      prevVal: Number,
      newVal: Number,
      prevCandidates: [Number],
      newCandidates: [Number],
      timestamp: { type: Date, default: Date.now }
    }
  ],
  mistakes: {
    type: Number,
    default: 0
  },
  maxMistakes: {
    type: Number,
    default: 3
  },
  hintsUsed: {
    type: Number,
    default: 0
  },
  score: {
    type: Number,
    default: 0
  },
  elapsedTime: {
    type: Number,
    default: 0 // In seconds
  },
  status: {
    type: String,
    enum: ['playing', 'paused', 'completed', 'failed', 'abandoned'],
    default: 'playing'
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Method to return public game state safely without revealing solution
gameSchema.methods.toPublicJSON = function() {
  const obj = this.toObject ? this.toObject() : { ...this };
  delete obj.solution;
  return obj;
};

module.exports = mongoose.models.Game || mongoose.model('Game', gameSchema);
