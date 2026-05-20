const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'bookleaf_secret_key_jwt_123', {
    expiresIn: '30d',
  });
};

// Login user
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      authorId: user.authorId || null,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      message: error.message || 'Server error',
      error: error.toString()
    });
  }
};

// Register user (Optional, mainly for convenience if creating new accounts)
const registerUser = async (req, res) => {
  const { name, email, password, role, authorId, phone, city } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please include name, email, and password' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'author',
      authorId: role === 'admin' ? undefined : authorId,
      phone,
      city,
    });

    if (user) {
      return res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        authorId: user.authorId || null,
        token: generateToken(user._id),
      });
    } else {
      return res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      message: error.message || 'Server error',
      error: error.toString()
    });
  }
};

// Get current user profile
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json(user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    return res.status(500).json({ 
      message: error.message || 'Server error',
      error: error.toString()
    });
  }
};

module.exports = {
  loginUser,
  registerUser,
  getMe,
};
