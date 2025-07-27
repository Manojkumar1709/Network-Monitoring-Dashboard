// network-monitor-backend/server.js
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const ping = require('ping');
const { monitorDevices } = require('./services/monitor');
const Device = require('./models/Device'); // Mongoose Device model
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// === Import Routes ===
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const deviceRoutes = require('./routes/deviceRoutes');

// Optional routes if file missing
let statsRoutes, alertsRoutes;
try {
  statsRoutes = require('./routes/stats');
} catch {
  statsRoutes = express.Router();
}
try {
  alertsRoutes = require('./routes/alerts');
} catch {
  alertsRoutes = express.Router();
}

// === Use Routes ===
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/alerts', alertsRoutes);

// === HTTP Server & Socket.IO ===
const server = http.createServer(app);
const { setupTerminalSocket } = require('./terminal/terminalSocket');
const io = require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
setupTerminalSocket(io);

// === Ping All Devices Every 10 Seconds ===
async function pingAllDevices() {
  try {
    const devices = await Device.find();
    for (const device of devices) {
      const result = await ping.promise.probe(device.ip);
      const newStatus = result.alive ? 'Online' : 'Offline';

      if (device.status !== newStatus) {
        await Device.updateOne({ _id: device._id }, { status: newStatus });
        console.log(`[PING] ${device.ip} is now ${newStatus}`);
      }
    }
  } catch (error) {
    console.error('[PING ERROR]', error.message);
  }
}
setInterval(pingAllDevices, 10000);
setInterval(monitorDevices, 10000);  

// === MongoDB Connection & Start Server ===
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost/netmon', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('✅ MongoDB connected');

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`✅ Server running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection failed:', err.message);
  });
