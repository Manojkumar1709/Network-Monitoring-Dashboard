const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

exports.register = async (req, res) => {
  const { username, email, password, role } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: 'User already exists' });

    const user = await User.create({
      username,
      email,
      password,
      role: role || 'User',
      mustResetPassword: true
    });

    const token = generateToken(user);

    res.status(201).json({
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        mustResetPassword: user.mustResetPassword
      },
      token
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });

    const token = generateToken(user);

    res.json({
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        mustResetPassword: user.mustResetPassword
      },
      token
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
