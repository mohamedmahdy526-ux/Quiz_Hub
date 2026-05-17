const db = require('./db');

// 🏆 جدول الدرجات البسيط الصافي
db.prepare(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE,
    username TEXT,
    score INTEGER DEFAULT 0
  )
`).run();

// 📢 📊 جدول الأهداف الديناميكي (الجروبات والقنوات المسجلة تلقائياً)
db.prepare(`
  CREATE TABLE IF NOT EXISTS targets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

console.log('✔ Simple Tables & Targets Schema Initialized.');