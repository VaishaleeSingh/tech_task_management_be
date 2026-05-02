const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  task_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  action: { type: String, required: true },
  entity_type: { type: String, required: true },
  entity_name: { type: String },
  details: { type: mongoose.Schema.Types.Mixed },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
