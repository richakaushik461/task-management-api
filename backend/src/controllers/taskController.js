const Task = require('../models/Task');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { getAsync, setAsync, delAsync } = require('../config/redis');

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Get all tasks (admin) or user's tasks
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *         description: Filter by priority
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
 *     responses:
 *       200:
 *         description: Tasks retrieved successfully
 */
const getTasks = async (req, res, next) => {
  try {
    const { status, priority, page = 1, limit = 10 } = req.query;
    
    // Build query
    const query = {};
    
    // Admin can see all tasks, users only their own
    if (req.user.role !== 'admin') {
      query.user = req.user.id;
    }
    
    if (status) query.status = status;
    if (priority) query.priority = priority;
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Check cache
    const cacheKey = `tasks:${req.user.id}:${JSON.stringify(query)}:${page}:${limit}`;
    const cachedData = await getAsync(cacheKey);
    
    if (cachedData) {
      return res.status(200).json({
        success: true,
        data: JSON.parse(cachedData),
        cached: true
      });
    }
    
    // Execute query
    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate('user', 'name email')
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Task.countDocuments(query)
    ]);
    
    const response = {
      tasks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    };
    
    // Cache for 5 minutes
    await setAsync(cacheKey, JSON.stringify(response), 'EX', 300);
    
    res.status(200).json({
      success: true,
      data: response
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /tasks:
 *   post:
 *     summary: Create a new task
 *     tags: [Tasks]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *               priority:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Task created successfully
 */
const createTask = async (req, res, next) => {
  try {
    const taskData = {
      ...req.body,
      user: req.user.id
    };
    
    const task = await Task.create(taskData);
    
    // Clear cache
    await delAsync(`tasks:${req.user.id}:*`);
    
    logger.info(`Task created: ${task.title} by user ${req.user.email}`);
    
    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { task }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /tasks/{id}:
 *   get:
 *     summary: Get a single task
 *     tags: [Tasks]
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
 *         description: Task retrieved successfully
 */
const getTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const task = await Task.findById(id).populate('user', 'name email');
    
    if (!task) {
      throw new AppError('Task not found', 404);
    }
    
    // Check permission
    if (req.user.role !== 'admin' && task.user._id.toString() !== req.user.id) {
      throw new AppError('You do not have permission to view this task', 403);
    }
    
    res.status(200).json({
      success: true,
      data: { task }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /tasks/{id}:
 *   put:
 *     summary: Update a task
 *     tags: [Tasks]
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
 *     responses:
 *       200:
 *         description: Task updated successfully
 */
const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    let task = await Task.findById(id);
    
    if (!task) {
      throw new AppError('Task not found', 404);
    }
    
    // Check permission
    if (req.user.role !== 'admin' && task.user.toString() !== req.user.id) {
      throw new AppError('You do not have permission to update this task', 403);
    }
    
    // Update task
    task = await Task.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    
    // Clear cache
    await delAsync(`tasks:${req.user.id}:*`);
    
    logger.info(`Task updated: ${task.title} by user ${req.user.email}`);
    
    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: { task }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
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
 *         description: Task deleted successfully
 */
const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const task = await Task.findById(id);
    
    if (!task) {
      throw new AppError('Task not found', 404);
    }
    
    // Check permission (only admin or task owner can delete)
    if (req.user.role !== 'admin' && task.user.toString() !== req.user.id) {
      throw new AppError('You do not have permission to delete this task', 403);
    }
    
    await task.deleteOne();
    
    // Clear cache
    await delAsync(`tasks:${req.user.id}:*`);
    
    logger.info(`Task deleted: ${task.title} by user ${req.user.email}`);
    
    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
    
  } catch (error) {
    next(error);
  }
};

// ============ ADDITIONAL FUNCTIONS ============

/**
 * Get task statistics
 */
const getTaskStats = async (req, res, next) => {
  try {
    const query = req.user.role === 'admin' ? {} : { user: req.user.id };
    
    const total = await Task.countDocuments(query);
    
    const byStatus = await Task.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const byPriority = await Task.aggregate([
      { $match: query },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);
    
    const statusObj = {};
    const priorityObj = {};
    
    byStatus.forEach(item => { statusObj[item._id] = item.count; });
    byPriority.forEach(item => { priorityObj[item._id] = item.count; });
    
    res.status(200).json({
      success: true,
      data: {
        total,
        byStatus: statusObj,
        byPriority: priorityObj
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update task status only (PATCH)
 */
const updateTaskStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, priority } = req.body;
    
    const task = await Task.findById(id);
    
    if (!task) {
      throw new AppError('Task not found', 404);
    }
    
    if (req.user.role !== 'admin' && task.user.toString() !== req.user.id) {
      throw new AppError('Not authorized', 403);
    }
    
    if (status) task.status = status;
    if (priority) task.priority = priority;
    
    await task.save();
    
    // Clear cache
    await delAsync(`tasks:${req.user.id}:*`);
    
    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: { task }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark task as complete
 */
const markAsComplete = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const task = await Task.findById(id);
    
    if (!task) {
      throw new AppError('Task not found', 404);
    }
    
    if (req.user.role !== 'admin' && task.user.toString() !== req.user.id) {
      throw new AppError('Not authorized', 403);
    }
    
    task.status = 'completed';
    await task.save();
    
    // Clear cache
    await delAsync(`tasks:${req.user.id}:*`);
    
    res.status(200).json({
      success: true,
      message: 'Task marked as complete',
      data: { task }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk delete tasks
 */
const bulkDeleteTasks = async (req, res, next) => {
  try {
    const { taskIds } = req.body;
    
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      throw new AppError('taskIds array is required', 400);
    }
    
    const query = {
      _id: { $in: taskIds }
    };
    
    if (req.user.role !== 'admin') {
      query.user = req.user.id;
    }
    
    const result = await Task.deleteMany(query);
    
    // Clear cache
    await delAsync(`tasks:${req.user.id}:*`);
    
    res.status(200).json({
      success: true,
      message: `${result.deletedCount} task(s) deleted successfully`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk update tasks
 */
const bulkUpdateTasks = async (req, res, next) => {
  try {
    const { taskIds, updateData } = req.body;
    
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      throw new AppError('taskIds array is required', 400);
    }
    
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new AppError('updateData is required', 400);
    }
    
    const query = {
      _id: { $in: taskIds }
    };
    
    if (req.user.role !== 'admin') {
      query.user = req.user.id;
    }
    
    const result = await Task.updateMany(query, { $set: updateData });
    
    // Clear cache
    await delAsync(`tasks:${req.user.id}:*`);
    
    res.status(200).json({
      success: true,
      message: `${result.modifiedCount} task(s) updated successfully`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get all tasks
 */
const getAllTasksAdmin = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, userId } = req.query;
    
    const query = {};
    if (userId) query.user = userId;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate('user', 'name email')
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Task.countDocuments(query)
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        tasks,
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
};

/**
 * Admin: Delete any task
 */
const adminDeleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const task = await Task.findByIdAndDelete(id);
    
    if (!task) {
      throw new AppError('Task not found', 404);
    }
    
    // Clear cache
    await delAsync(`tasks:${task.user}:*`);
    
    logger.info(`Admin ${req.user.email} deleted task: ${task.title}`);
    
    res.status(200).json({
      success: true,
      message: 'Task deleted successfully by admin'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export tasks
 */
const exportTasks = async (req, res, next) => {
  try {
    const query = req.user.role === 'admin' ? {} : { user: req.user.id };
    
    const tasks = await Task.find(query)
      .populate('user', 'name email')
      .sort('-createdAt')
      .lean();
    
    res.status(200).json({
      success: true,
      count: tasks.length,
      data: { tasks }
    });
  } catch (error) {
    next(error);
  }
};

// ============ EXPORT ALL FUNCTIONS ============

module.exports = {
  getTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  getTaskStats,
  updateTaskStatus,
  markAsComplete,
  bulkDeleteTasks,
  bulkUpdateTasks,
  getAllTasksAdmin,
  adminDeleteTask,
  exportTasks
};