// network-monitor-backend/server.js
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
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

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/alerts', alertsRoutes);

// === HTTP Server & Socket.io ===
const server = http.createServer(app);
const { setupTerminalSocket } = require('./terminal/terminalSocket'); // <-- next step
const io = require('socket.io')(server, {
  cors: {
    origin: '*', // allow all frontend origins (adjust if needed)
    methods: ['GET', 'POST']
  }
});
setupTerminalSocket(io); // register terminal logic

// === DB & Start ===
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
