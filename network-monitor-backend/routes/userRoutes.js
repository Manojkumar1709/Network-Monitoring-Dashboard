// routes/userRoutes.js
const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { getUserProfile } = require('../controllers/userController');

const router = express.Router();

router.get('/profile', protect, authorizeRoles('User', 'IT Admin', 'Admin'), getUserProfile);

module.exports = router;
