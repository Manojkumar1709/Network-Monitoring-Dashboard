// controllers/userController.js
exports.getUserProfile = async (req, res) => {
  try {
    res.status(200).json({ message: 'User profile data', user: req.user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load profile' });
  }
};
