const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check karo user already exist karta hai kya
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered hai!' });
    }

    // Password hash karo
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // User banao
    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    // JWT token banao
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully!',
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error!', error: err.message });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // User dhundho
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Email ya password galat hai!' });
    }

    // Password check karo
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Email ya password galat hai!' });
    }

    // Token banao
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful!',
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });

  } catch (err) {
    res.status(500).json({ message: 'Server error!', error: err.message });
  }
};

// Get current user
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error!', error: err.message });
  }
};

module.exports = { register, login, getMe };