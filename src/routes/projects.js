const express = require('express');
const { body } = require('express-validator');
const Project = require('../models/Project');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const { authenticate, requireProjectAccess } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

async function logActivity(userId, projectId, taskId, action, entityType, entityName, details = {}) {
  try {
    await ActivityLog.create({ user_id: userId, project_id: projectId, task_id: taskId, action, entity_type: entityType, entity_name: entityName, details });
  } catch (err) { console.error('Log error:', err); }
}

router.get('/', authenticate, async (req, res) => {
  try {
    const query = req.user.role === 'admin' ? {} : { $or: [{ owner_id: req.user._id }, { 'members.user_id': req.user._id }] };
    const projects = await Project.find(query).populate('owner_id', 'name avatar_color').sort({ createdAt: -1 });
    
    // Enrich with task counts
    const enriched = await Promise.all(projects.map(async p => {
      const taskCount = await Task.countDocuments({ project_id: p._id });
      const completedTasks = await Task.countDocuments({ project_id: p._id, status: 'done' });
      return {
        id: p._id,
        name: p.name,
        description: p.description,
        status: p.status,
        ownerId: p.owner_id._id,
        ownerName: p.owner_id.name,
        ownerAvatarColor: p.owner_id.avatar_color,
        dueDate: p.due_date,
        color: p.color,
        taskCount,
        completedTasks,
        memberCount: p.members.length + 1,
        createdAt: p.createdAt
      };
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:projectId', authenticate, requireProjectAccess, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId).populate('owner_id', 'name email avatar_color').populate('members.user_id', 'name email avatar_color');
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const taskCount = await Task.countDocuments({ project_id: project._id });
    const completedTasks = await Task.countDocuments({ project_id: project._id, status: 'done' });

    res.json({
      id: project._id,
      name: project.name,
      description: project.description,
      status: project.status,
      ownerId: project.owner_id._id,
      ownerName: project.owner_id.name,
      ownerEmail: project.owner_id.email,
      ownerAvatarColor: project.owner_id.avatar_color,
      dueDate: project.due_date,
      color: project.color,
      taskCount,
      completedTasks,
      members: project.members.map(m => ({
        id: m.user_id._id,
        name: m.user_id.name,
        email: m.user_id.email,
        avatarColor: m.user_id.avatar_color,
        role: m.role,
        joinedAt: m.joined_at
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authenticate,
  [body('name').trim().isLength({ min: 2 }), body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/)],
  validate,
  async (req, res) => {
    try {
      const project = await Project.create({ ...req.body, owner_id: req.user._id });
      await logActivity(req.user._id, project._id, null, 'created', 'project', project.name);
      res.status(201).json(project);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

router.put('/:projectId', authenticate, requireProjectAccess, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (project.owner_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Denied' });
    }

    Object.assign(project, req.body);
    await project.save();
    await logActivity(req.user._id, project._id, null, 'updated', 'project', project.name);
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:projectId', authenticate, requireProjectAccess, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (project.owner_id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Denied' });
    }
    await Project.findByIdAndDelete(req.params.projectId);
    await Task.deleteMany({ project_id: req.params.projectId });
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:projectId/members', authenticate, requireProjectAccess, async (req, res) => {
  try {
    const { userId, role = 'member' } = req.body;
    const project = await Project.findById(req.params.projectId);
    
    if (project.members.some(m => m.user_id.toString() === userId)) {
      return res.status(409).json({ message: 'Already a member' });
    }

    project.members.push({ user_id: userId, role });
    await project.save();
    
    const user = await User.findById(userId);
    await logActivity(req.user._id, project._id, null, 'added_member', 'project', user.name);
    res.status(201).json({ message: 'Added' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:projectId/members/:userId', authenticate, requireProjectAccess, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    project.members = project.members.filter(m => m.user_id.toString() !== req.params.userId);
    await project.save();
    res.json({ message: 'Removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
