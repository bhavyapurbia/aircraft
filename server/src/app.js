const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { errorHandler } = require('./middleware/errorHandler');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const activityRoutes = require('./routes/activityRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');
const staffRoutes = require('./routes/staffRoutes');
const conflictRoutes = require('./routes/conflictRoutes');
const optimisationRoutes = require('./routes/optimisationRoutes');
const scenarioRoutes = require('./routes/scenarioRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const auditRoutes = require('./routes/auditRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();

// Security and utility middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'AIR POWER - Dynamic Air Operations & Resource Optimisation',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Mount modular REST API endpoints
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/conflicts', conflictRoutes);
app.use('/api/optimisation', optimisationRoutes);
app.use('/api/scenarios', scenarioRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/settings', settingsRoutes);

// 404 Route Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint "${req.originalUrl}" not found.`
  });
});

// Centralized error handler
app.use(errorHandler);

module.exports = app;
