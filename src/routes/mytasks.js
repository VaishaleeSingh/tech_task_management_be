const express = require('express');
const Task = require('../models/Task');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { status, priority, search } = req.query;

    let filter = {
      $or: [
        { assignee_id: req.user._id },
        { created_by: req.user._id }
      ]
    };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (search) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]
      });
    }

    const tasks = await Task.find(filter)
      .populate('assignee_id', 'name avatar_color')
      .populate('project_id', 'name color')
      .sort({ updatedAt: -1 });

    res.json(tasks.map(t => ({
      id: t._id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      projectId: t.project_id?._id,
      projectName: t.project_id?.name,
      projectColor: t.project_id?.color,
      assigneeName: t.assignee_id?.name,
      assigneeAvatarColor: t.assignee_id?.avatar_color,
      dueDate: t.due_date,
      createdAt: t.createdAt
    })));
  } catch (error) {
    console.error('MyTasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
