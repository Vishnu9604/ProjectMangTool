const express = require('express');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get project analytics
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user has access to project
    if (project.owner.toString() !== req.user.id && !project.members.includes(req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const tasks = await Task.find({ project: req.params.projectId });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'Done').length;
    const inProgressTasks = tasks.filter(task => task.status === 'In Progress').length;
    const todoTasks = tasks.filter(task => task.status === 'To Do').length;

    const totalTimeSpent = tasks.reduce((sum, task) => sum + (task.timeSpent || 0), 0);
    const totalEstimatedTime = tasks.reduce((sum, task) => sum + (task.estimatedTime || 0), 0);

    const tasksByPriority = {
      High: tasks.filter(task => task.priority === 'High').length,
      Medium: tasks.filter(task => task.priority === 'Medium').length,
      Low: tasks.filter(task => task.priority === 'Low').length,
    };

    const overdueTasks = tasks.filter(task => task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'Done').length;

    res.json({
      totalTasks,
      completedTasks,
      inProgressTasks,
      todoTasks,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      totalTimeSpent,
      totalEstimatedTime,
      tasksByPriority,
      overdueTasks,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get user analytics
router.get('/user/:userId', auth, async (req, res) => {
  try {
    // Users can only view their own analytics or admins can view all
    if (req.user.id !== req.params.userId && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const tasks = await Task.find({ assignedTo: req.params.userId });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'Done').length;
    const inProgressTasks = tasks.filter(task => task.status === 'In Progress').length;

    const totalTimeSpent = tasks.reduce((sum, task) => sum + (task.timeSpent || 0), 0);
    const totalEstimatedTime = tasks.reduce((sum, task) => sum + (task.estimatedTime || 0), 0);

    const averageCompletionTime = completedTasks > 0 ? totalTimeSpent / completedTasks : 0;

    res.json({
      totalTasks,
      completedTasks,
      inProgressTasks,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      totalTimeSpent,
      totalEstimatedTime,
      averageCompletionTime,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
