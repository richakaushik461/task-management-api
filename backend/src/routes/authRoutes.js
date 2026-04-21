const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validation');

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and management
 */

// Public routes
router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/refresh-token', authController.refreshToken);

// Protected routes
router.use(authenticate);
router.post('/logout', authController.logout);
router.get('/me', authController.getMe);

module.exports = router;