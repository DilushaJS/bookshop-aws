const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { testConnection } = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandling');

// Import routes
const authRoutes = require('./routes/auth');
const booksRoutes = require('./routes/books');
const cartRoutes = require('./routes/cart');
const ordersRoutes = require('./routes/orders');
const categoriesRoutes = require('./routes/categories');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(compression()); // Compress responses
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/categories', categoriesRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Bookshop API',
    version: '1.0.0',
    description: 'Professional bookshop e-commerce API for AWS deployment',
    endpoints: {
      auth: '/api/auth',
      books: '/api/books',
      cart: '/api/cart',
      orders: '/api/orders',
      categories: '/api/categories',
      health: '/health'
    }
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      console.error('Failed to connect to database. Please check your configuration.');
      process.exit(1);
    }

    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║              🚀 BOOKSHOP API SERVER STARTED 🚀             ║
║                                                            ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  Environment: ${process.env.NODE_ENV || 'development'}                                   ║
║  Port:        ${PORT}                                          ║
║  Database:    Connected ✓                                  ║
║                                                            ║
║  API Base:    http://localhost:${PORT}/api                  ║
║  Health:      http://localhost:${PORT}/health               ║
║                                                            ║
║  Ready to accept requests!                                 ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});

startServer();

module.exports = app;