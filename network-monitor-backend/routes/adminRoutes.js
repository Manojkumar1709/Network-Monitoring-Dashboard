// routes/adminRoutes.js
const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { createUser, getAllUsers, createUserByAdmin } = require('../controllers/adminController');

const router = express.Router();

router.post('/create-user', protect, authorizeRoles('Admin'), createUser);
router.get('/users', protect, authorizeRoles('Admin'), getAllUsers);
router.post('/users', protect, authorizeRoles('Admin'), createUserByAdmin);

module.exports = router;
