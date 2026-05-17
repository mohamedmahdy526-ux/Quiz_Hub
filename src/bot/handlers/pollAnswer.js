const db = require('../../database/db');

async function handlePollAnswer(ctx) {
  const answer = ctx.update.poll_answer;
  const pollId = answer.poll_id;
  const userId = answer.user.id;
  const firstName = answer.user.first_name;

  // لو الطالب مسح إجابته خالص تليجرام بيبعت Array فاضية
  if (answer.option_ids.length === 0) return;
  const selectedOption = answer.option_ids[0];

  try {
    // 1. البحث عن الـ Poll للتأكد إنه تبع الكويز بتاعنا
    const poll = db.prepare(`
      SELECT * FROM polls
      WHERE poll_id = ?
    `).get(pollId);

    if (!poll) {
      return console.log(`⚠️ [DB Warning] Poll ID ${pollId} not found in database.`);
    }

    const isCorrect = (selectedOption === poll.correct_option);

    // 2. التحقق المعماري: هل الطالب جاوب على السؤال ده قبل كده؟
    const existing = db.prepare(`
      SELECT * FROM answers
      WHERE user_id = ? AND poll_id = ?
    `).get(userId, pollId);

    // 🛡️ السيناريو الأول: أول مرة الطالب يجاوب (نضيف الإجابة ونحسب السكور)
    if (!existing) {
      // حفظ الإجابة في جدول الـ answers فوراً لقفل الباب
      db.prepare(`
        INSERT INTO answers (user_id, poll_id, selected_option)
        VALUES (?, ?, ?)
      `).run(userId, pollId, selectedOption);

      console.log('\n====================================');
      console.log(`👤 STUDENT: ${firstName} (First Attempt)`);
      console.log(`📊 ANSWER STATE: ${isCorrect ? '✅ CORRECT ✔' : '❌ WRONG ✖'}`);
      console.log('====================================');

      // لو أول محاولة صحيحة، نزيد السكور
      if (isCorrect) {
        db.prepare(`
          INSERT INTO scores (user_id, name, score)
          VALUES (?, ?, 1)
          ON CONFLICT(user_id)
          DO UPDATE SET score = score + 1
        `).run(userId, firstName);

        console.log(`📈 [Score Up] ${firstName}'s total score updated (+1).`);
      }
    } 
    // 🚷 السيناريو الثاني: الطالب بيحاول يغير إجابته (نرفض تعديل السكور لمنع الغش)
    else {
      console.log('\n====================================');
      console.log(`👤 STUDENT: ${firstName}`);
      console.log(`🚨 ALERT: Tried to change answer! Blocked from score modification.`);
      console.log('====================================');
      
      // ملحوظة للمستقبل: لو حابب مستقبلاً تحدث إجابته في جدول answers بدون لعب في السكور:
      // db.prepare('UPDATE answers SET selected_option = ? WHERE user_id = ? AND poll_id = ?').run(selectedOption, userId, pollId);
    }

  } catch (error) {
    console.error('❌ Error in pollAnswer protection logic:', error.message);
  }
}

module.exports = {
  handlePollAnswer
};