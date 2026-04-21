const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const taskRoutes = require('./taskRoutes');
const userRoutes = require('./userRoutes');

// API versioning
router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);
router.use('/users', userRoutes);

// API documentation route
router.get('/', (req, res) => {
  res.json({
    message: 'Task Management API',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      auth: '/api/v1/auth',
      tasks: '/api/v1/tasks',
      users: '/api/v1/users'
    }
  });
});

module.exports = router;