/**
 * Auth Controller
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const MemoryStore = require('../services/memoryStore');
const { getIsConnected } = require('../config/db');
const { JWT_SECRET } = require('../middleware/authMiddleware');

function generateToken(userId) {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '30d' });
}

// POST /api/users/register
async function register(req, res, next) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email, and password.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.'
      });
    }

    if (getIsConnected()) {
      const existingUser = await User.findOne({
        $or: [{ email: email.toLowerCase() }, { username }]
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: existingUser.email === email.toLowerCase() 
            ? 'Email already registered.' 
            : 'Username is already taken.'
        });
      }

      const user = await User.create({
        username,
        email: email.toLowerCase(),
        password
      });

      const token = generateToken(user._id);

      return res.status(201).json({
        success: true,
        message: 'Registration successful.',
        token,
        user: user.toSafeObject()
      });
    } else {
      const existingEmail = await MemoryStore.findUserByEmail(email);
      if (existingEmail) {
        return res.status(409).json({ success: false, message: 'Email already registered.' });
      }
      const existingName = await MemoryStore.findUserByUsername(username);
      if (existingName) {
        return res.status(409).json({ success: false, message: 'Username is already taken.' });
      }

      const user = await MemoryStore.createUser({ username, email, password });
      const token = generateToken(user._id);

      return res.status(201).json({
        success: true,
        message: 'Registration successful.',
        token,
        user: user.toSafeObject()
      });
    }
  } catch (error) {
    next(error);
  }
}

// POST /api/users/login
async function login(req, res, next) {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your username/email and password.'
      });
    }

    let user = null;

    if (getIsConnected()) {
      user = await User.findOne({
        $or: [
          { email: emailOrUsername.toLowerCase() },
          { username: emailOrUsername }
        ]
      }).select('+password');

      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
      }

      const token = generateToken(user._id);

      return res.json({
        success: true,
        message: 'Logged in successfully.',
        token,
        user: user.toSafeObject()
      });
    } else {
      user = await MemoryStore.findUserByEmail(emailOrUsername) || 
             await MemoryStore.findUserByUsername(emailOrUsername);

      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
      }

      const token = generateToken(user._id);

      return res.json({
        success: true,
        message: 'Logged in successfully.',
        token,
        user: user.toSafeObject()
      });
    }
  } catch (error) {
    next(error);
  }
}

// GET /api/users/profile
async function getProfile(req, res) {
  return res.json({
    success: true,
    user: req.user.toSafeObject()
  });
}

module.exports = {
  register,
  login,
  getProfile
};
