const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbFile = 'quiz.db';
const backupFile = 'quiz_backup.db';

if (!fs.existsSync(dbFile) && fs.existsSync(backupFile)) {
  try {
    fs.copyFileSync(backupFile, dbFile);
    console.log('✔ Database restored from backup file successfully.');
  } catch (err) {
    console.error('❌ Failed to restore database from backup:', err.message);
  }
}

const db = new Database(dbFile);

console.log('✔ Database connected successfully.');

module.exports = db;