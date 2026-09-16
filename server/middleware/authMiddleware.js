/**
 * Authentication Middleware
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const MemoryStore = require('../services/memoryStore');
const { getIsConnected } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_sudoku_2026_dev_mode_change_in_prod';

/**
 * Extracts and verifies JWT from Authorization header.
 * @param {object} req 
 * @returns {object|null}
 */
async function authenticateToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    let user = null;

    if (getIsConnected()) {
      user = await User.findById(decoded.id);
    } else {
      user = await MemoryStore.findUserById(decoded.id);
    }

    return user;
  } catch (err) {
    return null;
  }
}

/**
 * Required Auth Middleware: rejects unauthorized requests.
 */
async function requireAuth(req, res, next) {
  const user = await authenticateToken(req);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Please login to access this resource.'
    });
  }
  req.user = user;
  next();
}

/**
 * Optional Auth Middleware: populates req.user if token is present and valid, but does not block guests.
 */
async function optionalAuth(req, res, next) {
  const user = await authenticateToken(req);
  if (user) {
    req.user = user;
  }
  next();
}

module.exports = {
  requireAuth,
  optionalAuth,
  JWT_SECRET
};
