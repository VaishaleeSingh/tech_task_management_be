const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  status: { type: String, enum: ['active', 'completed', 'archived', 'on_hold'], default: 'active' },
  owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  due_date: { type: Date },
  color: { type: String, default: '#6C63FF' },
  members: [{
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['admin', 'member'], default: 'member' },
    joined_at: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);
