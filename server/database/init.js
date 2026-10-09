const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  multipleStatements: true
};

async function initDatabase() {
  console.log('Connecting to MySQL at', `${config.host}:${config.port}...`);
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('Connected to MySQL server.');

    // Step 1: Ensure database exists
    const dbName = process.env.DB_NAME || 'air_power_db';
    console.log(`Ensuring database "${dbName}" exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await connection.changeUser({ database: dbName });

    // Step 2: Run schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      console.log('Executing schema.sql...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await connection.query(schemaSql);
      console.log('Schema created successfully.');
    }

    // Step 3: Run seed.sql
    const seedPath = path.join(__dirname, 'seed.sql');
    if (fs.existsSync(seedPath)) {
      console.log('Executing seed.sql...');
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await connection.query(seedSql);
      console.log('Seed data inserted successfully.');
    }

    // Verify row counts
    const [users] = await connection.query('SELECT COUNT(*) as cnt FROM users');
    const [resources] = await connection.query('SELECT COUNT(*) as cnt FROM resources');
    const [activities] = await connection.query('SELECT COUNT(*) as cnt FROM activities');
    const [conflicts] = await connection.query('SELECT COUNT(*) as cnt FROM schedule_conflicts');

    console.log('=== Database Initialisation Summary ===');
    console.log(`- Users: ${users[0].cnt}`);
    console.log(`- Aviation Resources: ${resources[0].cnt}`);
    console.log(`- Scheduled Activities: ${activities[0].cnt}`);
    console.log(`- Active Conflicts: ${conflicts[0].cnt}`);
    console.log('Database ready for AIR POWER operations!');
  } catch (err) {
    console.error('Database initialisation error:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };
