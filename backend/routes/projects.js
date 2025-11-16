const express = require('express');
const Project = require('../models/Project');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all projects
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.user.id },
        { members: req.user.id }
      ]
    }).populate('owner members', 'name email');
    res.json(projects);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get single project
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id).populate('owner members', 'name email');
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user is owner or member
    if (project.owner._id.toString() !== req.user.id && !project.members.some(member => member._id.toString() === req.user.id)) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(project);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Create project
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, members } = req.body;

    const project = new Project({
      name,
      description,
      owner: req.user.id,
      members: members || [],
    });

    await project.save();
    await project.populate('owner members', 'name email');

    res.json(project);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update project
router.put('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only owner can update project
    if (project.owner._id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, description, members, status } = req.body;
    project.name = name || project.name;
    project.description = description || project.description;
    project.members = members || project.members;
    project.status = status || project.status;

    await project.save();
    await project.populate('owner members', 'name email');

    res.json(project);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Delete project
router.delete('/:id', auth, authorize('Admin', 'Manager'), async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only owner or admin can delete
    if (project.owner._id.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    await project.remove();
    res.json({ message: 'Project removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
