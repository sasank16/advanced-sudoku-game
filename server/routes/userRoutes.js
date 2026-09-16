/**
 * User Routes
 */

const express = require('express');
const router = express.Router();
const { getStatistics, updatePreferences } = require('../controllers/userController');
const { requireAuth } = require('../middleware/authMiddleware');

router.get('/statistics', requireAuth, getStatistics);
router.put('/preferences', requireAuth, updatePreferences);

module.exports = router;
