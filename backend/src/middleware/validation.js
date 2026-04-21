const { body, validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

// Validation error handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => error.msg);
    return next(new AppError(errorMessages.join(', '), 400));
  }
  next();
};

// User registration validation
const validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password must contain at least one letter and one number'),
  
  validate
];

// User login validation
const validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required'),
  
  validate
];

// Task creation/update validation
const validateTask = [
  body('title')
    .trim()
    .notEmpty().withMessage('Task title is required')
    .isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
  
  body('status')
    .optional()
    .isIn(['pending', 'in-progress', 'completed']).withMessage('Invalid status value'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high']).withMessage('Invalid priority value'),
  
  body('dueDate')
    .optional()
    .isISO8601().withMessage('Invalid date format')
    .custom(value => {
      if (new Date(value) < new Date()) {
        throw new Error('Due date must be in the future');
      }
      return true;
    }),
  
  validate
];

module.exports = {
  validateRegister,
  validateLogin,
  validateTask
};