const db = require('./db');

// جدول الدرجات البسيط الصافي لحساب السكور
db.prepare(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE,
    username TEXT,
    score INTEGER DEFAULT 0
  )
`).run();

console.log('✔ Simple Tables Initialized.');