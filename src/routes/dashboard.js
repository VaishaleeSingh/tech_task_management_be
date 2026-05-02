const express = require('express');
const Project = require('../models/Project');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';

    // 1. Project Stats
    const projectFilter = isAdmin ? {} : { $or: [{ owner_id: userId }, { 'members.user_id': userId }] };
    const totalProjects = await Project.countDocuments(projectFilter);

    // 2. Task Stats
    const taskFilter = isAdmin ? {} : { $or: [{ assignee_id: userId }, { created_by: userId }] };
    const tasks = await Task.find(taskFilter);
    
    const stats = {
      totalProjects,
      totalTasks: tasks.length,
      todoTasks: tasks.filter(t => t.status === 'todo').length,
      inProgressTasks: tasks.filter(t => t.status === 'in_progress').length,
      inReviewTasks: tasks.filter(t => t.status === 'in_review').length,
      doneTasks: tasks.filter(t => t.status === 'done').length,
      overdueTasks: tasks.filter(t => t.due_date && t.due_date < new Date() && t.status !== 'done').length,
    };

    // 3. Overdue detailed
    const overdueTasks = await Task.find({
      ...taskFilter,
      due_date: { $lt: new Date() },
      status: { $ne: 'done' }
    }).populate('project_id', 'name').limit(5);

    // 4. Recent Tasks
    const recentTasks = await Task.find(taskFilter)
      .populate('project_id', 'name color')
      .populate('assignee_id', 'name avatar_color')
      .sort({ updatedAt: -1 })
      .limit(8);

    // 5. Recent Activity
    let activityFilter = {};
    if (!isAdmin) {
      const myProjects = await Project.find(projectFilter).select('_id');
      activityFilter = { project_id: { $in: myProjects.map(p => p._id) } };
    }
    const recentActivity = await ActivityLog.find(activityFilter)
      .populate('user_id', 'name avatar_color')
      .sort({ created_at: -1 })
      .limit(10);

    // 6. Project Progress
    const activeProjects = await Project.find({ ...projectFilter, status: 'active' }).limit(5);
    const projectProgress = await Promise.all(activeProjects.map(async p => {
      const total = await Task.countDocuments({ project_id: p._id });
      const done = await Task.countDocuments({ project_id: p._id, status: 'done' });
      return {
        id: p._id,
        name: p.name,
        color: p.color,
        status: p.status,
        dueDate: p.due_date,
        totalTasks: total,
        completedTasks: done,
        progress: total > 0 ? Math.round((done / total) * 100) : 0
      };
    }));

    res.json({
      stats,
      overdueTasks: overdueTasks.map(t => ({ id: t._id, title: t.title, priority: t.priority, dueDate: t.due_date, projectName: t.project_id.name })),
      recentTasks: recentTasks.map(t => ({
        id: t._id, title: t.title, status: t.status, priority: t.priority, dueDate: t.due_date,
        projectName: t.project_id.name, projectColor: t.project_id.color,
        assigneeName: t.assignee_id?.name, assigneeAvatarColor: t.assignee_id?.avatar_color
      })),
      recentActivity: recentActivity.map(a => ({
        id: a._id, action: a.action, entityType: a.entity_type, entityName: a.entity_name,
        userName: a.user_id?.name, userAvatarColor: a.user_id?.avatar_color,
        projectId: a.project_id, taskId: a.task_id, createdAt: a.created_at
      })),
      projectProgress
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
