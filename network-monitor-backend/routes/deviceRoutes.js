// network-monitor-backend/routes/deviceRoutes.js
const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const { getDevices, getDeviceMonitoringData, addDevice } = require('../controllers/deviceController');

const router = express.Router();

router.get('/', protect, authorizeRoles('Admin', 'IT Admin', 'User'), getDevices); // List devices
router.post('/monitor', protect, authorizeRoles('Admin', 'IT Admin'), getDeviceMonitoringData); // Get metrics
router.post('/add', protect, authorizeRoles('Admin'), addDevice); // Add new device

module.exports = router;
