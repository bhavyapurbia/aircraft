const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { sqliteQuery, sqliteTransaction, sqlitePool, DB_PATH } = require('./sqliteDb');

let activeEngine = null; // 'mysql' | 'sqlite'
let mysqlPool = null;

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'air_power_db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  dateStrings: true
};

// Client preference: 'auto' (default), 'mysql', or 'sqlite'
const preferredClient = (process.env.DB_CLIENT || 'auto').toLowerCase();

async function initDatabaseConnection() {
  if (activeEngine) return activeEngine;

  if (preferredClient === 'sqlite') {
    activeEngine = 'sqlite';
    console.log('[DATABASE] DB_CLIENT=sqlite set. Using local embedded SQLite database.');
    return activeEngine;
  }

  // Attempt MySQL connection
  try {
    const testPool = mysql.createPool({
      ...dbConfig,
      connectTimeout: 2000
    });
    const conn = await testPool.getConnection();
    conn.release();
    mysqlPool = testPool;
    activeEngine = 'mysql';
    console.log(`[DATABASE] Connected successfully to MySQL (${dbConfig.host}:${dbConfig.port}/${dbConfig.database}).`);
    return activeEngine;
  } catch (err) {
    if (preferredClient === 'mysql') {
      console.error('[DATABASE ERROR] Failed connecting to MySQL (DB_CLIENT=mysql):', err.message);
      throw err;
    }

    console.warn('================================================================');
    console.warn(`[DATABASE NOTICE] MySQL not reachable on ${dbConfig.host}:${dbConfig.port} (${err.code || err.message}).`);
    console.warn(`[DATABASE NOTICE] Activating zero-config embedded SQLite database:`);
    console.warn(`[DATABASE NOTICE] Location: ${DB_PATH}`);
    console.warn('================================================================');
    activeEngine = 'sqlite';
    return activeEngine;
  }
}

async function query(sql, params = []) {
  if (!activeEngine) {
    await initDatabaseConnection();
  }

  if (activeEngine === 'mysql') {
    const [rows] = await mysqlPool.execute(sql, params);
    return rows;
  } else {
    return await sqliteQuery(sql, params);
  }
}

async function transaction(callback) {
  if (!activeEngine) {
    await initDatabaseConnection();
  }

  if (activeEngine === 'mysql') {
    const connection = await mysqlPool.getConnection();
    await connection.beginTransaction();
    try {
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } else {
    return await sqliteTransaction(callback);
  }
}

const pool = {
  getConnection: async () => {
    if (!activeEngine) {
      await initDatabaseConnection();
    }
    if (activeEngine === 'mysql') {
      return await mysqlPool.getConnection();
    } else {
      return await sqlitePool.getConnection();
    }
  },
  execute: async (sql, params) => {
    if (!activeEngine) {
      await initDatabaseConnection();
    }
    if (activeEngine === 'mysql') {
      return await mysqlPool.execute(sql, params);
    } else {
      return await sqlitePool.execute(sql, params);
    }
  },
  query: async (sql, params) => {
    if (!activeEngine) {
      await initDatabaseConnection();
    }
    if (activeEngine === 'mysql') {
      return await mysqlPool.query(sql, params);
    } else {
      return await sqlitePool.query(sql, params);
    }
  },
  end: () => {
    if (mysqlPool) {
      mysqlPool.end();
      mysqlPool = null;
    }
    sqlitePool.end();
    activeEngine = null;
  }
};

function getActiveEngine() {
  return activeEngine;
}

module.exports = {
  pool,
  query,
  transaction,
  initDatabaseConnection,
  getActiveEngine
};
