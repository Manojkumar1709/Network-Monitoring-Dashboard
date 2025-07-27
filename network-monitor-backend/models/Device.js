const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  ip: { type: String, required: true, unique: true },
  status: { type: String, default: 'Unknown' },
  lastUpdated: { type: Date, default: Date.now },
  os: String,
  cpu: Object,
  ram: Object,
  disk: Object,
  ports: [Object]
});

module.exports = mongoose.model('Device', deviceSchema);
