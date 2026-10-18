const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { getDatabase, sqliteQuery, DB_PATH } = require('../src/config/sqliteDb');

const config = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  multipleStatements: true,
  connectTimeout: 2500
};

async function initDatabase() {
  const preferredClient = (process.env.DB_CLIENT || 'auto').toLowerCase();

  if (preferredClient === 'sqlite') {
    return initSqlite();
  }

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

    console.log('=== MySQL Database Initialisation Summary ===');
    console.log(`- Users: ${users[0].cnt}`);
    console.log(`- Aviation Resources: ${resources[0].cnt}`);
    console.log(`- Scheduled Activities: ${activities[0].cnt}`);
    console.log(`- Active Conflicts: ${conflicts[0].cnt}`);
    console.log('Database ready for AIR POWER operations!');
  } catch (err) {
    if (preferredClient === 'mysql') {
      console.error('Database initialisation error (MySQL required):', err.message);
      process.exit(1);
    }

    console.warn(`MySQL initialisation skipped (${err.message}). Initialising SQLite fallback...`);
    return initSqlite();
  } finally {
    if (connection) await connection.end();
  }
}

async function initSqlite() {
  console.log('Initialising embedded SQLite database at:', DB_PATH);
  // Remove existing sqlite database if running manual re-init
  if (fs.existsSync(DB_PATH)) {
    try {
      fs.unlinkSync(DB_PATH);
      console.log('Cleared previous SQLite database file.');
    } catch (e) {
      // Ignored if busy
    }
  }

  getDatabase();

  const [users] = await sqliteQuery('SELECT COUNT(*) as cnt FROM users');
  const [resources] = await sqliteQuery('SELECT COUNT(*) as cnt FROM resources');
  const [activities] = await sqliteQuery('SELECT COUNT(*) as cnt FROM activities');
  const [conflicts] = await sqliteQuery('SELECT COUNT(*) as cnt FROM schedule_conflicts');

  console.log('=== SQLite Initialisation Summary ===');
  console.log(`- Database file: ${DB_PATH}`);
  console.log(`- Users: ${users.cnt}`);
  console.log(`- Aviation Resources: ${resources.cnt}`);
  console.log(`- Scheduled Activities: ${activities.cnt}`);
  console.log(`- Active Conflicts: ${conflicts.cnt}`);
  console.log('SQLite database ready for AIR POWER operations!');
}

if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };
