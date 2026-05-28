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

router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, status, priority, due_date } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const task = await Task.create({
      title,
      description,
      status: status || 'todo',
      priority: priority || 'medium',
      due_date,
      created_by: req.user._id,
      assignee_id: req.user._id
    });
    
    res.status(201).json({
      id: task._id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.due_date,
      createdAt: task.createdAt
    });
  } catch (error) {
    console.error('Create Task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:taskId', authenticate, async (req, res) => {
  try {
    const task = await Task.findOneAndUpdate(
      { _id: req.params.taskId, created_by: req.user._id },
      req.body,
      { new: true }
    );
    if (!task) return res.status(404).json({ message: 'Task not found' });
    
    res.json({
      id: task._id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.due_date,
      createdAt: task.createdAt
    });
  } catch (error) {
    console.error('Update Task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:taskId', authenticate, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.taskId, created_by: req.user._id });
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Delete Task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
