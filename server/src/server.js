const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const app = require('./app');
const { pool } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Verify database connection
    try {
      const connection = await pool.getConnection();
      console.log('Successfully connected to MySQL database pool.');
      connection.release();
    } catch (dbErr) {
      console.error('================================================================');
      console.error('[DATABASE CONNECTION ERROR]');
      console.error('Unable to connect to MySQL on port 3306.');
      console.error('Error Details:', dbErr.message);
      console.error('Please ensure MySQL / MariaDB (e.g. via XAMPP) is started.');
      console.error('================================================================');
      process.exit(1);
    }

    const server = app.listen(PORT, () => {
      console.log('================================================================');
      console.log(' AIR POWER — Dynamic Air Operations & Resource Optimisation ');
      console.log(` Backend REST API Server listening on: http://localhost:${PORT}`);
      console.log(` Health check: http://localhost:${PORT}/api/health`);
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
        console.log('HTTP server closed and MySQL pool drained.');
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
