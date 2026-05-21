/**
 * Smart Quiz Parser Engine (Pure TXT Edition) 🚀
 * يدعم: الترقيم النظيف، الخيارات A) B)، وصيغة الإجابة الطبية Answer: B
 */
function parseQuestions(text) {
  // توحيد فاصل السطور ومسح ترميز الويندوز \r لضمان الثبات الكامل
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleanText.split('\n');
  
  const questions = [];
  let current = null;

  // خريطة تحويل الحروف إلى Index تليجرام الآمن
  const answerMap = {
    A: 0, B: 1, C: 2, D: 3, E: 4, F: 5,
    a: 0, b: 1, c: 2, d: 3, e: 4, f: 5
  };

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    /**
     * 1️⃣ لقطة رأس السؤال (مثال: 1. أو 1))
     */
    if (/^\d+[\.\)]/.test(line)) {
      if (current) {
        questions.push(current);
      }

      // مسح الترقيم من رأس السؤال عشان تليجرام بيرقم تلقائي
      line = line.replace(/^\d+[\.\)]\s*/, '').trim();

      current = {
        question: line,
        options: [],
        correct: 0
      };
    }
    /**
     * 2️⃣ لقطة الاختيارات المتتالية (مثال: A) أو B))
     */
    else if (/^[A-F][\)\.]/i.test(line)) {
      if (!current) continue;

      let optionText = line.replace(/^[A-F][\)\.]\s*/i, '').trim();

      // دعم النجمة الاحتياطية القديمة لو موجودة
      if (optionText.includes('*')) {
        current.correct = current.options.length;
        optionText = optionText.replace('*', '').trim();
      }

      current.options.push(optionText);
    }
    /**
     * 3️⃣ لقطة الإجابة المستقلة الثابتة (Answer: B)
     */
    else if (/^Answer\s*:\s*([A-F])/i.test(line)) {
      if (!current) continue;

      const match = line.match(/^Answer\s*:\s*([A-F])/i);
      if (match && match[1]) {
        const correctLetter = match[1];
        current.correct = answerMap[correctLetter];
      }
    }
    /**
     * 4️⃣ لقطة الملف الصوتي الطبي المرفق (Audio: file_id_or_url)
     */
    else if (/^Audio\s*:\s*(.+)/i.test(line)) {
      if (!current) continue;

      const match = line.match(/^Audio\s*:\s*(.+)/i);
      if (match && match[1]) {
        current.audio = match[1].trim();
      }
    }
  }

  // حفظ آخر سؤال في الحلقة
  if (current) {
    questions.push(current);
  }

  return questions;
}

module.exports = {
  parseQuestions
};