const express = require('express');
const { body } = require('express-validator');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');
const { authenticate, requireProjectAccess } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router({ mergeParams: true });

async function logActivity(userId, projectId, taskId, action, entityType, entityName, details = {}) {
  try {
    await ActivityLog.create({ user_id: userId, project_id: projectId, task_id: taskId, action, entity_type: entityType, entity_name: entityName, details });
  } catch (err) { console.error('Log error:', err); }
}

router.get('/', authenticate, requireProjectAccess, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { status, priority, assigneeId, search } = req.query;

    let filter = { project_id: projectId };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assigneeId) filter.assignee_id = assigneeId;
    if (search) filter.$or = [{ title: { $regex: search, $options: 'i' } }, { description: { $regex: search, $options: 'i' } }];

    const tasks = await Task.find(filter)
      .populate('assignee_id', 'name avatar_color email')
      .populate('created_by', 'name avatar_color')
      .sort({ createdAt: -1 });

    res.json(tasks.map(t => ({
      id: t._id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      projectId: t.project_id,
      assigneeId: t.assignee_id?._id,
      assigneeName: t.assignee_id?.name,
      assigneeAvatarColor: t.assignee_id?.avatar_color,
      createdBy: t.created_by._id,
      creatorName: t.created_by.name,
      dueDate: t.due_date,
      estimatedHours: t.estimated_hours,
      tags: t.tags,
      commentCount: t.comments.length,
      createdAt: t.createdAt
    })));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:taskId', authenticate, requireProjectAccess, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId)
      .populate('assignee_id', 'name avatar_color email')
      .populate('created_by', 'name avatar_color')
      .populate('comments.user_id', 'name avatar_color');
    
    if (!task) return res.status(404).json({ message: 'Not found' });

    res.json({
      ...task.toObject(),
      id: task._id,
      assigneeName: task.assignee_id?.name,
      assigneeAvatarColor: task.assignee_id?.avatar_color,
      creatorName: task.created_by.name,
      comments: task.comments.map(c => ({
        id: c._id,
        content: c.content,
        authorId: c.user_id._id,
        authorName: c.user_id.name,
        authorAvatarColor: c.user_id.avatar_color,
        createdAt: c.created_at
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authenticate, requireProjectAccess,
  [body('title').trim().notEmpty()],
  validate,
  async (req, res) => {
    try {
      const task = await Task.create({ ...req.body, project_id: req.params.projectId, created_by: req.user._id });
      await logActivity(req.user._id, req.params.projectId, task._id, 'created', 'task', task.title);
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({ message: 'Server error' });
    }
  }
);

router.put('/:taskId', authenticate, requireProjectAccess, async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.taskId, req.body, { new: true });
    await logActivity(req.user._id, req.params.projectId, task._id, 'updated', 'task', task.title);
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:taskId', authenticate, requireProjectAccess, async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.taskId);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:taskId/comments', authenticate, requireProjectAccess, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    task.comments.push({ user_id: req.user._id, content: req.body.content });
    await task.save();
    res.status(201).json({ message: 'Commented' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
