const Database = require('better-sqlite3');
const db = new Database('quiz.db');

console.log('✔ Database connected successfully.');

module.exports = db;