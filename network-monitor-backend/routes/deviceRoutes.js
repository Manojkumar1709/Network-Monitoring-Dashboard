const express = require("express");
const router = express.Router();

// Import controller and middleware
const deviceController = require("../controllers/deviceController");
const { protect, authorizeRoles } = require("../middleware/authMiddleware");
const {
  runVulnerabilityScan, // Add this line
} = require("../controllers/deviceController");

/*
 * ===============================================
 * Role-Based Access Control (RBAC)
 * ===============================================
 * 'Admin', 'IT Admin': Full access (add, delete, view, export).
 * 'User': Read-only access (view lists and monitor).
 * ===============================================
 */

// --- Routes with Middleware Protection ---

// POST /api/devices - Add a new device
// Requires Admin or IT Admin role
router.post(
  "/add",
  protect,
  authorizeRoles("Admin", "IT Admin"),
  deviceController.addDevice
);

// GET /api/devices - Get a list of all saved devices
// Accessible to all authenticated users
router.get(
  "/",
  protect,
  authorizeRoles("Admin", "IT Admin", "User"),
  deviceController.getDevices
);

// DELETE /api/devices/:id - Delete a device by its IP address
// Requires Admin or IT Admin role
router.delete(
  "/:id",
  protect,
  authorizeRoles("Admin"),
  deviceController.deleteDevice
);

// POST /api/devices/monitor - Get live monitoring data for a single device
// Accessible to all authenticated users
router.post(
  "/monitor",
  protect,
  authorizeRoles("Admin", "IT Admin", "User"),
  deviceController.getDeviceMonitoringData
);

// GET /api/devices/monitor/all - Get stored monitoring data for all devices
// Accessible to all authenticated users
router.get(
  "/monitor-all",
  protect,
  authorizeRoles("Admin", "IT Admin", "User"),
  deviceController.getAllDeviceMonitoringData
);

// GET /api/devices/export - Export all device data as a JSON file
// Requires Admin or IT Admin role
router.get(
  "/export",
  protect,
  authorizeRoles("Admin", "IT Admin"),
  deviceController.exportDevices
);

// POST /api/devices/monitor/store - Placeholder route for storing data
// Requires Admin or IT Admin role
router.post(
  "/monitor/store",
  protect,
  authorizeRoles("Admin", "IT Admin"),
  deviceController.storeDeviceMonitoringData
);

router.post(
  "/vuln-scan",
  protect,
  authorizeRoles("Admin", "IT Admin", "User"),
  runVulnerabilityScan
);

module.exports = router;
