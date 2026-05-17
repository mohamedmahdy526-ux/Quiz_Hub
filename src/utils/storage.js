const storage = {};

function saveQuestions(userId, data) {
  storage[userId] = data; // يحفظ الكائن بالكامل { lectureName, questions }
}

function getQuestions(userId) {
  return storage[userId];
}

module.exports = {
  saveQuestions,
  getQuestions
};