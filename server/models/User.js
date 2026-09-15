/**
 * User Model
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  stats: {
    gamesPlayed: { type: Number, default: 0 },
    gamesCompleted: { type: Number, default: 0 },
    gamesWon: { type: Number, default: 0 },
    totalScore: { type: Number, default: 0 },
    bestScore: { type: Number, default: 0 },
    totalPlayTime: { type: Number, default: 0 }, // in seconds
    bestTime: {
      easy: { type: Number, default: null },
      medium: { type: Number, default: null },
      hard: { type: Number, default: null },
      expert: { type: Number, default: null }
    },
    totalMistakes: { type: Number, default: 0 },
    totalHintsUsed: { type: Number, default: 0 }
  },
  preferences: {
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'dark' },
    soundEffects: { type: Boolean, default: true },
    highlightDuplicates: { type: Boolean, default: true },
    highlightSameNumbers: { type: Boolean, default: true },
    highlightRelated: { type: Boolean, default: true },
    autoRemoveCandidates: { type: Boolean, default: true },
    maxMistakesLimit: { type: Number, default: 3 }
  }
}, {
  timestamps: true
});

// Password hash middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Safe JSON representation (strip password)
userSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
