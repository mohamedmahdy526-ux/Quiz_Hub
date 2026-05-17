function parseQuestions(text) {

  text = text.replace(/\r/g, '');

  const lines = text.split('\n');

  const questions = [];

  let current = null;

  for (let rawLine of lines) {

    const line = rawLine.trim();

    if (!line) continue;

    // بداية سؤال
    if (/^\d+\./.test(line)) {

      if (current) {
        questions.push(current);
      }

      current = {
        question: line.replace(/^\d+\.\s*/, ''),
        options: [],
        correct: 0
      };
    }

    // أي اختيار A) B) C) D) E) F)
    else if (/^[A-Z]\)/i.test(line)) {

      current.options.push(
        line.replace(/^[A-Z]\)\s*/i, '')
      );
    }

    // الإجابة
    else if (/^Answer:/i.test(line)) {

      const answer =
        line
        .replace(/^Answer:/i, '')
        .trim()
        .toUpperCase();

      // تحويل الحرف إلى index
      current.correct =
        answer.charCodeAt(0) - 65;
    }
  }

  if (current) {
    questions.push(current);
  }

  return questions;
}

module.exports = {
  parseQuestions
};