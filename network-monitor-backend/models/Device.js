const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  ip: { type: String, required: true, unique: true },
  hostname: { type: String },
  status: { type: String, default: 'Unknown' },
  lastUpdated: { type: Date, default: Date.now },
  os: String,
  cpuCores: String,
  ramTotal: String,
  diskTotal: String,
  cpuUsagePercent: String,
  ramUsagePercent: String,
  diskUsagePercent: String,
  networkUsageKBps: String,
  // Storing the open ports from the basic nmap scan
  basicScan: {
    openPorts: [String],
  },
  // Storing the full text output of a vulnerability scan
  vulnerabilityScan: { type: String }, 
});

module.exports = mongoose.model('Device', deviceSchema);
