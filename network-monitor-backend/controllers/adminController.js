// controllers/adminController.js
const User = require("../models/User");
const { randomBytes } = require("crypto");
const { sendCredentialsEmail } = require("../utils/emailService");

exports.createUser = async (req, res) => {
  const { username, email, password, role } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "User already exists" });

    const newUser = new User({ username, email, password, role });
    await newUser.save();

    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error creating user", error: err.message });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, "-password");
    res.status(200).json(users);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch users", error: err.message });
  }
};

exports.createUserByAdmin = async (req, res) => {
  const { email, role } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res
        .status(400)
        .json({ message: "User with this email already exists." });
    }

    const username = email.split("@")[0];
    const password = randomBytes(8).toString("hex"); // This is the plain text password

    let dbRole;
    if (role === "it-admin") {
      dbRole = "IT Admin";
    } else {
      dbRole = "User";
    }

    const user = await User.create({
      username,
      email,
      password, // The password will be hashed before it's saved to the DB
      role: dbRole,
    });

    if (user) {
      // Return the credentials directly in the response
      res.status(201).json({
        message: `User ${email} created successfully.`,
        email: user.email,
        password: password, // The auto-generated plain text password
      });
    } else {
      res.status(400).json({ message: "Invalid user data." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error while creating user." });
  }
};
