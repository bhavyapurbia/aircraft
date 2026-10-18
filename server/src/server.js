const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const app = require('./app');
const { pool, getActiveEngine } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Verify database connection
    try {
      const connection = await pool.getConnection();
      const engine = getActiveEngine() || 'database';
      console.log(`[BOOT] Successfully connected to ${engine.toUpperCase()} database engine.`);
      connection.release();
    } catch (dbErr) {
      console.error('================================================================');
      console.error('[DATABASE CONNECTION ERROR]');
      console.error('Unable to connect to database pool.');
      console.error('Error Details:', dbErr.message);
      console.error('================================================================');
      process.exit(1);
    }

    const server = app.listen(PORT, () => {
      const engine = getActiveEngine() || 'SQL';
      console.log('================================================================');
      console.log(' AIR POWER — Dynamic Air Operations & Resource Optimisation ');
      console.log(` Backend REST API Server listening on: http://localhost:${PORT}`);
      console.log(` Active Database Engine: ${engine.toUpperCase()}`);
      console.log(` Health check: http://localhost:${PORT}/api/health`);
      console.log(' Default Logins:');
      console.log('   - Admin:   admin   / Admin@12345');
      console.log('   - Planner: planner / Planner@12345');
      console.log('   - Viewer:  viewer  / Viewer@12345');
      console.log('================================================================');
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error('================================================================');
        console.error(`[PORT CONFLICT ERROR] Port ${PORT} is already occupied by another process.`);
        console.error('If another instance of the server is running, terminate it first,');
        console.error('or change PORT=5001 in your server/.env file.');
        console.error('================================================================');
        process.exit(1);
      } else {
        console.error('[SERVER ERROR]:', err.message);
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        pool.end();
        console.log('HTTP server closed and database pool drained.');
      });
    });

  } catch (error) {
    console.error('Fatal Server Boot Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
