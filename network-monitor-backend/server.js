const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // To parse incoming JSON requests

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/userRoutes'));   // ✅ Add this line
app.use('/api/admin', require('./routes/adminRoutes')); // ✅ Add this line

// MongoDB connection and server startup
mongoose.connect(process.env.MONGO_URI).then(() => {
  app.listen(process.env.PORT, () => {
    console.log(`✅ Server running at http://localhost:${process.env.PORT}`);
  });
}).catch(err => {
  console.error('❌ MongoDB connection failed:', err.message);
});
