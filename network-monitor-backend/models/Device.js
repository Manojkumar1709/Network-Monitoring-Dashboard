const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  ip: { type: String, required: true, unique: true },
  mac: { type: String },
  hostname: { type: String },
  status: { type: String, default: 'Unknown' }
}, { timestamps: true });

module.exports = mongoose.model('Device', deviceSchema);
