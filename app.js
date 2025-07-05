const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://opengovdatahub.com',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Basic routes for testing
app.get('/', (req, res) => {
  res.json({
    message: 'OpenGov DataHub Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      docs: '/api/routes'
    }
  });
});

// Debug route to list all available routes
app.get('/api/routes', (req, res) => {
  res.json({
    message: 'Available API routes',
    routes: {
      system: [
        'GET / - API info',
        'GET /api/health - Health check',
        'GET /api/routes - This endpoint'
      ],
      note: 'Authentication and search routes will be added after successful deployment'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    suggestion: 'Try GET /api/routes to see all available endpoints'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;