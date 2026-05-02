const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
  avatar_color: { type: String, default: '#6C63FF' },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
