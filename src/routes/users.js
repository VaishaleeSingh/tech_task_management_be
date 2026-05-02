const express = require('express');
const { body } = require('express-validator');
const User = require('../models/User');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users.map(u => ({
      id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      avatarColor: u.avatar_color,
      createdAt: u.createdAt
    })));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/search', authenticate, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json([]);

    const users = await User.find({
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    }).limit(10);

    res.json(users.map(u => ({ id: u._id, name: u.name, email: u.email, avatarColor: u.avatar_color })));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/role', authenticate, requireAdmin,
  [body('role').isIn(['admin', 'member'])],
  validate,
  async (req, res) => {
    try {
      if (req.params.id === req.user._id.toString()) return res.status(400).json({ message: 'Cannot change your own role' });
      const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true });
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.json({ id: user._id, name: user.name, role: user.role });
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) return res.status(400).json({ message: 'Cannot delete yourself' });
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
