const express = require('express');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');
const {
  getDevices,
  getDeviceMonitoringData,
  addDevice,
  deleteDevice,
  getAllDeviceMonitoringData,
  storeDeviceMonitoringData, // optional if using destructuring
} = require('../controllers/deviceController');

const deviceController = require('../controllers/deviceController'); // ✅ add this

const router = express.Router();

router.get('/', protect, authorizeRoles('Admin', 'IT Admin', 'User'), getDevices);
router.post('/monitor', protect, authorizeRoles('Admin', 'IT Admin'), getDeviceMonitoringData);
router.post('/add', protect, authorizeRoles('Admin'), addDevice);
router.delete('/:id', protect, authorizeRoles('Admin'), deleteDevice);
router.get('/monitor-all', protect, authorizeRoles('Admin', 'IT Admin'), getAllDeviceMonitoringData);
router.post('/store-devices', deviceController.storeDeviceMonitoringData); // ✅ no more error

module.exports = router;
