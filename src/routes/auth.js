const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const User = require('../models/User');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/signup',
  [
    body('name').trim().isLength({ min: 2, max: 100 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('role').optional().isIn(['admin', 'member']),
  ],
  validate,
  async (req, res) => {
    try {
      const { name, email, password, role = 'member' } = req.body;

      const existing = await User.findOne({ email });
      if (existing) return res.status(409).json({ message: 'Email already registered' });

      const passwordHash = await bcrypt.hash(password, 12);
      const colors = ['#6C63FF', '#FF6584', '#43B97F', '#FF8C42', '#3B82F6', '#8B5CF6', '#EC4899', '#10B981'];
      const avatar_color = colors[Math.floor(Math.random() * colors.length)];

      const user = await User.create({ name, email, password_hash: passwordHash, role, avatar_color });

      const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

      res.status(201).json({
        message: 'Account created successfully',
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, avatarColor: user.avatar_color }
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

router.post('/login',
  [body('email').isEmail(), body('password').notEmpty()],
  validate,
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });

      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

      res.json({
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role, avatarColor: user.avatar_color }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

router.get('/me', authenticate, async (req, res) => {
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    avatarColor: req.user.avatar_color,
    createdAt: req.user.createdAt
  });
});

router.get('/users', authenticate, async (req, res) => {
  try {
    const users = await User.find({}, 'name email role avatar_color').sort('name');
    res.json(users.map(u => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      avatarColor: u.avatar_color
    })));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
});

module.exports = router;
