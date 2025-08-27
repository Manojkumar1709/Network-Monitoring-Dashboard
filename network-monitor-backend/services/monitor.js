const ping = require('ping');
const Device = require('../models/Device');
const getDeviceMetrics = require('./netdataService'); // ← your script to get metrics

async function monitorDevices() {
  const devices = await Device.find();

  for (const device of devices) {
    const res = await ping.promise.probe(device.ip);
    const status = res.alive ? 'Online' : 'Offline';

    let updatedData = { status, lastUpdated: new Date() };

    if (status === 'Online') {
      try {
        const metrics = await getDeviceMetrics(device.ip); // ← gets latest metrics
        updatedData = { ...updatedData, ...metrics };
      } catch (err) {
        console.log(`❌ Error fetching metrics for ${device.ip}: ${err.message}`);
      }
    }

    await Device.updateOne({ _id: device._id }, { $set: updatedData });
  }
}

module.exports = { monitorDevices };
