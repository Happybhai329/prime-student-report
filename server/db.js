import pg from 'pg';
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

let dbType = 'sqlite'; // 'postgres' | 'sqlite'
let pgPool = null;
let sqliteDb = null;

/**
 * Initialize Database Connection
 * Tries PostgreSQL first if DATABASE_URL is configured.
 * Gracefully falls back to local SQLite3 if PostgreSQL fails.
 */
export async function initDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && databaseUrl.startsWith('postgres')) {
    try {
      console.log('Connecting to PostgreSQL / Supabase...');
      const pool = new Pool({
        connectionString: databaseUrl,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
        max: 10
      });

      // Test connection
      const client = await pool.connect();
      client.release();

      pgPool = pool;
      dbType = 'postgres';
      console.log('Connected to PostgreSQL database successfully.');
    } catch (err) {
      console.warn('PostgreSQL connection failed:', err.message);
      console.warn('Falling back to local SQLite3 database...');
      initSqlite();
    }
  } else {
    console.log('No PostgreSQL DATABASE_URL found. Using local SQLite3 database...');
    initSqlite();
  }

  await createTables();
  return { dbType };
}

function initSqlite() {
  dbType = 'sqlite';
  const dbDir = path.resolve(__dirname, '../data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  const sqliteFile = path.join(dbDir, 'student_prime.db');
  sqliteDb = new sqlite3.Database(sqliteFile, (err) => {
    if (err) {
      console.error('Failed to open SQLite database:', err.message);
    } else {
      console.log(`SQLite database opened at: ${sqliteFile}`);
    }
  });
}

/**
 * Execute a SQL query with unified interface across PostgreSQL and SQLite
 * Supports $1, $2, ... placeholders (auto-converted to ? for SQLite)
 */
export async function query(sql, params = []) {
  if (dbType === 'postgres') {
    const res = await pgPool.query(sql, params);
    return {
      rows: res.rows,
      rowCount: res.rowCount
    };
  }

  // SQLite execution
  return new Promise((resolve, reject) => {
    const convertedSql = sql.replace(/\$\d+/g, '?');
    const trimmed = convertedSql.trim();
    const isSelect = /^SELECT\b/i.test(trimmed) || /RETURNING\b/i.test(trimmed);

    if (isSelect) {
      sqliteDb.all(convertedSql, params, (err, rows) => {
        if (err) return reject(err);
        resolve({ rows: rows || [], rowCount: rows ? rows.length : 0 });
      });
    } else {
      sqliteDb.run(convertedSql, params, function (err) {
        if (err) return reject(err);
        resolve({ rows: [], rowCount: this.changes, lastID: this.lastID });
      });
    }
  });
}

/**
 * Fast multi-row batch insert helper
 */
export async function batchInsert(table, columns, rows, chunkSize = 1000) {
  if (!rows || !rows.length) return;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const valuePlaceholders = [];
    const params = [];
    let paramIndex = 1;

    for (const row of chunk) {
      const rowPlaceholders = [];
      for (const col of columns) {
        rowPlaceholders.push(`$${paramIndex++}`);
        params.push(row[col] !== undefined ? row[col] : null);
      }
      valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
    }

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${valuePlaceholders.join(', ')}`;
    await query(sql, params);
  }
}

/**
 * Fast multi-row batch upsert helper
 */
export async function batchUpsert(table, columns, conflictCol, updateCols, rows, chunkSize = 200) {
  if (!rows || !rows.length) return;
  const isPg = dbType === 'postgres';

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const valuePlaceholders = [];
    const params = [];
    let paramIndex = 1;

    for (const row of chunk) {
      const rowPlaceholders = [];
      for (const col of columns) {
        rowPlaceholders.push(`$${paramIndex++}`);
        params.push(row[col] !== undefined ? row[col] : null);
      }
      valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
    }

    let sql = '';
    if (isPg) {
      const hasLastSynced = columns.includes('last_synced');
      const updateClause = updateCols.map(c => `${c} = EXCLUDED.${c}`).join(', ');
      const extraSet = hasLastSynced && !updateCols.includes('last_synced') ? ', last_synced = CURRENT_TIMESTAMP' : '';
      sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${valuePlaceholders.join(', ')}
             ON CONFLICT (${conflictCol}) DO UPDATE SET ${updateClause}${extraSet}`;
    } else {
      sql = `INSERT OR REPLACE INTO ${table} (${columns.join(', ')}) VALUES ${valuePlaceholders.join(', ')}`;
    }

    await query(sql, params);
  }
}

/**
 * Create relational tables & indexes
 */
async function createTables() {
  console.log(`Creating database schema (${dbType})...`);

  const idColDef = dbType === 'postgres' ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const tsColDef = dbType === 'postgres' ? 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP' : 'DATETIME DEFAULT CURRENT_TIMESTAMP';

  // 1. Prime Employees table (dedicated to avoid collision with other systems)
  await query(`
    CREATE TABLE IF NOT EXISTS prime_employees (
      employee_id TEXT PRIMARY KEY,
      name TEXT,
      department TEXT,
      role TEXT,
      email TEXT,
      contact TEXT,
      status TEXT,
      last_synced ${tsColDef}
    );
  `);

  // 2. Students table
  await query(`
    CREATE TABLE IF NOT EXISTS students (
      student_id TEXT PRIMARY KEY,
      student_name TEXT,
      father_name TEXT,
      batch TEXT,
      class_name TEXT,
      school TEXT,
      mobile TEXT,
      email TEXT,
      program TEXT,
      dob TEXT,
      last_synced ${tsColDef}
    );
  `);

  // 3. Batches table
  await query(`
    CREATE TABLE IF NOT EXISTS batches (
      batch_name TEXT PRIMARY KEY,
      classroom TEXT,
      writing_class TEXT,
      actual_class TEXT,
      subjects_offered TEXT,
      last_synced ${tsColDef}
    );
  `);

  // 4. Attendance table
  await query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id ${idColDef},
      student_id TEXT,
      date TEXT,
      batch TEXT,
      presence_type TEXT,
      teacher_id TEXT,
      teacher_name TEXT,
      call_reason TEXT
    );
  `);

  // 5. Homework table
  await query(`
    CREATE TABLE IF NOT EXISTS homework (
      id ${idColDef},
      student_id TEXT,
      date TEXT,
      subject TEXT,
      status TEXT,
      final_status TEXT,
      duration_min REAL DEFAULT 0,
      teacher_id TEXT,
      teacher_name TEXT,
      start_time TEXT,
      end_time TEXT
    );
  `);

  // 6. Exam Results table
  await query(`
    CREATE TABLE IF NOT EXISTS exam_results (
      id ${idColDef},
      test_id TEXT,
      exam_date TEXT,
      batch_name TEXT,
      exam_type TEXT,
      student_id TEXT,
      student_name TEXT,
      rank REAL,
      total_obtained_marks REAL,
      exam_total_max_marks REAL,
      subject_name TEXT,
      subject_obtained_marks REAL,
      subject_max_marks REAL
    );
  `);

  // 7. Complaints table
  await query(`
    CREATE TABLE IF NOT EXISTS complaints (
      complaint_id TEXT PRIMARY KEY,
      student_id TEXT,
      student_name TEXT,
      batch TEXT,
      teacher_name TEXT,
      teacher_employee_id TEXT,
      department TEXT,
      complaint_text TEXT,
      status TEXT,
      pdf_link TEXT,
      date TEXT,
      submitted_at TEXT
    );
  `);

  // 8. Sync Meta table
  await query(`
    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at ${tsColDef}
    );
  `);

  // Indexes for sub-50ms performance
  await query(`CREATE INDEX IF NOT EXISTS idx_prime_employees_id ON prime_employees(employee_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_students_name ON students(student_name);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_students_batch ON students(batch);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON attendance(student_id, date);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_homework_student_date ON homework(student_id, date);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_exam_results_student_test ON exam_results(student_id, test_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_complaints_student ON complaints(student_id);`);

  console.log('Database schema ready.');
}

export function getDbType() {
  return dbType;
}
