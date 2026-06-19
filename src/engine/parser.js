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

    // أي اختيار A) B) C) D) E) F) أو A. B. C. D. E. F.
    else if (/^[A-F][\)\.]/i.test(line)) {

      current.options.push(
        line.replace(/^[A-F][\)\.]\s*/i, '').trim()
      );
    }

    // الإجابة
    else if (/^\*?\*?\s*Answer\s*:\s*\*?\*?\s*([A-F])/i.test(line)) {

      const match = line.match(/^\*?\*?\s*Answer\s*:\s*\*?\*?\s*([A-F])/i);
      if (match && match[1]) {
        const answer = match[1].trim().toUpperCase();
        current.correct = answer.charCodeAt(0) - 65;
      }
    }

    // التوضيح
    else if (/^\*?\*?\s*(Explanation|explanation|توضيح)\s*\*?\*?\s*:\s*\*?\*?\s*(.+)/i.test(line)) {
      const match = line.match(/^\*?\*?\s*(Explanation|explanation|توضيح)\s*\*?\*?\s*:\s*\*?\*?\s*(.+)/i);
      if (match && match[2]) {
        current.explanation = match[2].replace(/\s*\*?\*?$/, '').trim();
      }
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