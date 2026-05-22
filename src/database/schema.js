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

// 🌳 جدول الشجرة للمواد والمجلدات والملفات (Nodes)
db.prepare(`
  CREATE TABLE IF NOT EXISTS nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    parent_id INTEGER,
    telegram_file_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// 🔍 الترقية الذكية (Auto-Migration) لإضافة حقل telegram_file_id لجدول nodes لو مش موجود
try {
  const columns = db.prepare("PRAGMA table_info(nodes)").all();
  const hasFileId = columns.some(col => col.name === 'telegram_file_id');
  if (!hasFileId) {
    db.prepare("ALTER TABLE nodes ADD COLUMN telegram_file_id TEXT").run();
    console.log("✔ Auto-Migration: Added 'telegram_file_id' column to 'nodes' table.");
  }
} catch (err) {
  console.error("❌ Auto-Migration failed for 'nodes' table:", err.message);
}

// 🗳️ جدول أسئلة البولس (Polls Mapping)
db.prepare(`
  CREATE TABLE IF NOT EXISTS polls (
    poll_id TEXT PRIMARY KEY,
    correct_option INTEGER
  )
`).run();

console.log('✔ Database Schema & Auto-Migrations Initialized successfully.');