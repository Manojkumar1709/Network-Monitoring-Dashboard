// routes/adminRoutes.js
const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { createUser, getAllUsers } = require('../controllers/adminController');

const router = express.Router();

router.post('/create-user', protect, authorizeRoles('Admin'), createUser);
router.get('/users', protect, authorizeRoles('Admin'), getAllUsers);

module.exports = router;
