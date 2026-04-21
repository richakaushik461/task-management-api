const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    let token;
    
    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Check if token exists
    if (!token) {
      throw new AppError('Authentication required. Please log in.', 401);
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const user = await User.findById(decoded.id).select('-__v');
      
      if (!user) {
        throw new AppError('User not found or account deactivated', 401);
      }
      
      if (!user.isActive) {
        throw new AppError('Account is deactivated. Please contact support.', 401);
      }
      
      // Attach user to request
      req.user = user;
      next();
      
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Token expired. Please log in again.', 401);
      } else if (error.name === 'JsonWebTokenError') {
        throw new AppError('Invalid token. Please log in again.', 401);
      }
      throw error;
    }
    
  } catch (error) {
    next(error);
  }
};

/**
 * Authorization middleware
 * Checks if user has required role(s)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    
    next();
  };
};

module.exports = { authenticate, authorize };