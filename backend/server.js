// Load environment variables first
require('dotenv').config();

console.log('========================================');
console.log('Starting Task Management API Server...');
console.log('========================================');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('PORT:', process.env.PORT || 5000);
console.log('MongoDB URI exists:', !!process.env.MONGODB_URI);
console.log('');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple logger
const log = {
  info: (msg) => console.log('[INFO]', new Date().toISOString(), '-', msg),
  error: (msg) => console.error('[ERROR]', new Date().toISOString(), '-', msg),
  success: (msg) => console.log('[SUCCESS]', new Date().toISOString(), '-', msg)
};

// Health check endpoint (no DB required)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Task Management API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api/v1'
    }
  });
});

// Try to load API routes
try {
  const routes = require('./src/routes');
  app.use('/api/v1', routes);
  log.success('API Routes loaded successfully');
} catch (error) {
  log.error('Failed to load routes: ' + error.message);
  console.error(error.stack);
}

// Try to load Swagger documentation
try {
  const swaggerUi = require('swagger-ui-express');
  const swaggerSpecs = require('./src/config/swagger');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
  log.success('Swagger documentation loaded at /api-docs');
} catch (error) {
  log.error('Swagger not available: ' + error.message);
}

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  log.error(err.message);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Connect to MongoDB
log.info('Connecting to MongoDB...');

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000
})
.then(() => {
  log.success('MongoDB Connected Successfully');
  
  // Start server
  app.listen(PORT, () => {
    console.log('');
    console.log('========================================');
    log.success('Server is running on port ' + PORT);
    log.success('Environment: ' + (process.env.NODE_ENV || 'development'));
    log.success('Health check: http://localhost:' + PORT + '/health');
    log.success('API base: http://localhost:' + PORT + '/api/v1');
    log.success('API docs: http://localhost:' + PORT + '/api-docs');
    console.log('========================================');
  });
})
.catch(err => {
  log.error('MongoDB Connection Failed: ' + err.message);
  console.error('Full error:', err);
  
  // Start server anyway (without database)
  log.info('Starting server WITHOUT database connection...');
  
  app.listen(PORT, () => {
    console.log('');
    console.log('========================================');
    log.success('Server is running on port ' + PORT + ' (NO DATABASE)');
    log.success('Health check: http://localhost:' + PORT + '/health');
    console.log('========================================');
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  log.error('UNCAUGHT EXCEPTION: ' + err.message);
  console.error(err.stack);
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  log.error('UNHANDLED REJECTION: ' + err.message);
  console.error(err.stack);
});

console.log('Server initialization in progress...');
