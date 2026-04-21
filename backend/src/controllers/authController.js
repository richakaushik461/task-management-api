const User = require('../models/User');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { getAsync, setAsync, delAsync } = require('../config/redis');

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('Email already registered', 409);
    }
    
    // Create new user
    const user = await User.create({
      name,
      email,
      password
    });
    
    // Generate tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    
    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    
    logger.info(`New user registered: ${email}`);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }
    
    // Check if account is active
    if (!user.isActive) {
      throw new AppError('Account is deactivated', 401);
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }
    
    // Update last login
    user.lastLogin = new Date();
    
    // Generate tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    
    // Save refresh token
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    
    logger.info(`User logged in: ${email}`);
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
const logout = async (req, res, next) => {
  try {
    // Clear refresh token
    const user = await User.findById(req.user.id);
    user.refreshToken = null;
    await user.save({ validateBeforeSave: false });
    
    // Clear cache if exists
    await delAsync(`user:${req.user.id}`);
    
    logger.info(`User logged out: ${req.user.email}`);
    
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    
    // Find user with refresh token
    const user = await User.findOne({ 
      _id: decoded.id, 
      refreshToken 
    }).select('+refreshToken');
    
    if (!user) {
      throw new AppError('Invalid refresh token', 401);
    }
    
    // Generate new tokens
    const newAccessToken = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();
    
    // Update refresh token
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });
    
    res.status(200).json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      }
    });
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      next(new AppError('Refresh token expired', 401));
    } else {
      next(error);
    }
  }
};

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved
 */
const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  getMe
};