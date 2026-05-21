const fs = require('fs');
const path = require('path');

const quizzesFile = path.join(__dirname, '../../quizzes.json');

function loadQuizzes() {
  if (!fs.existsSync(quizzesFile)) {
    fs.writeFileSync(quizzesFile, JSON.stringify({}));
  }
  try {
    return JSON.parse(fs.readFileSync(quizzesFile, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveQuizzes(data) {
  fs.writeFileSync(quizzesFile, JSON.stringify(data, null, 2));
}

function saveQuestions(userId, data) {
  const quizzes = loadQuizzes();
  // حفظ تحت معرف الأدمن للجلسة المؤقتة للنشر
  quizzes[String(userId)] = data;
  // حفظ تحت اسم المحاضرة للرجوع إليها مستقبلاً بالكامل
  quizzes[String(data.lectureName)] = data.questions;
  saveQuizzes(quizzes);
}

function getQuestions(userId) {
  const quizzes = loadQuizzes();
  return quizzes[String(userId)];
}

module.exports = {
  saveQuestions,
  getQuestions,
  loadQuizzes
};