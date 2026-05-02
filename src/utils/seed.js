const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');

async function seedDatabase() {
  try {
    const count = await User.countDocuments();
    if (count > 0) return;

    console.log('🌱 Seeding MongoDB...');

    const passwordHash = await bcrypt.hash('demo1234', 12);

    // 1. Create Users
    const admin = await User.create({ name: 'Admin User', email: 'admin@demo.com', password_hash: passwordHash, role: 'admin', avatar_color: '#6C63FF' });
    const member = await User.create({ name: 'Member User', email: 'member@demo.com', password_hash: passwordHash, role: 'member', avatar_color: '#FF6584' });

    // 2. Create Project
    const project = await Project.create({
      name: 'TaskFlow Launch',
      description: 'Internal project to track the official launch of TaskFlow.',
      status: 'active',
      owner_id: admin._id,
      color: '#6C63FF',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      members: [{ user_id: member._id, role: 'member' }]
    });

    // 3. Create Tasks
    await Task.create([
      { title: 'Finalize UI/UX Design', status: 'done', priority: 'high', project_id: project._id, assignee_id: admin._id, created_by: admin._id },
      { title: 'Implement JWT Auth', status: 'done', priority: 'urgent', project_id: project._id, assignee_id: admin._id, created_by: admin._id },
      { title: 'Database Migration', status: 'in_progress', priority: 'medium', project_id: project._id, assignee_id: member._id, created_by: admin._id },
      { title: 'Beta Testing', status: 'todo', priority: 'high', project_id: project._id, assignee_id: member._id, created_by: admin._id, due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }
    ]);

    console.log('✨ MongoDB Seeding complete!');
  } catch (error) {
    console.error('❌ Seeding error:', error);
  }
}

module.exports = { seedDatabase };
