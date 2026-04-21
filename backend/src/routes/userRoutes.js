const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints (Admin only)
 */

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filter by role
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *       403:
 *         description: Not authorized to access this resource
 */
router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, isActive } = req.query;
    
    // Build query
    const query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Execute query
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-__v -refreshToken')
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      User.countDocuments(query)
    ]);
    
    logger.info(`Admin ${req.user.email} retrieved users list`);
    
    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *       404:
 *         description: User not found
 */
router.get('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-__v -refreshToken -password')
      .populate('tasks', 'title status priority');
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    logger.info(`Admin ${req.user.email} retrieved user ${user.email}`);
    
    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 */
router.put('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { name, email, role, isActive } = req.body;
    
    // Don't allow admin to change their own role (safety measure)
    if (req.params.id === req.user.id && role && role !== req.user.role) {
      throw new AppError('You cannot change your own role', 400);
    }
    
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-__v -refreshToken -password');
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    logger.info(`Admin ${req.user.email} updated user ${user.email}`);
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Delete user (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       400:
 *         description: Cannot delete own account
 */
router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.user.id) {
      throw new AppError('You cannot delete your own account', 400);
    }
    
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Also delete all tasks associated with this user
    const Task = require('../models/Task');
    await Task.deleteMany({ user: req.params.id });
    
    logger.info(`Admin ${req.user.email} deleted user ${user.email}`);
    
    res.status(200).json({
      success: true,
      message: 'User and all associated tasks deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /users/{id}/deactivate:
 *   patch:
 *     summary: Deactivate user account (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deactivated successfully
 */
router.patch('/:id/deactivate', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      throw new AppError('You cannot deactivate your own account', 400);
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-__v -refreshToken -password');
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    logger.info(`Admin ${req.user.email} deactivated user ${user.email}`);
    
    res.status(200).json({
      success: true,
      message: 'User deactivated successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /users/{id}/activate:
 *   patch:
 *     summary: Activate user account (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User activated successfully
 */
router.patch('/:id/activate', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: true },
      { new: true }
    ).select('-__v -refreshToken -password');
    
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    logger.info(`Admin ${req.user.email} activated user ${user.email}`);
    
    res.status(200).json({
      success: true,
      message: 'User activated successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /users/stats/overview:
 *   get:
 *     summary: Get user statistics (Admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 */
router.get('/stats/overview', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [
      totalUsers,
      activeUsers,
      adminUsers,
      usersByRole,
      recentUsers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'admin' }),
      User.aggregate([
        { $group: { _id: '$role', count: { $sum: 1 } } }
      ]),
      User.find()
        .select('name email role createdAt')
        .sort('-createdAt')
        .limit(5)
        .lean()
    ]);
    
    const stats = {
      totalUsers,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      adminUsers,
      regularUsers: totalUsers - adminUsers,
      roles: usersByRole.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      recentUsers
    };
    
    res.status(200).json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;