const db = require('../../database/db');

async function handleScores(ctx) {
  try {
    // جلب أعلى 10 طلاب بترتيب تنازلي (الأعلى سكور أولاً)
    const scores = db.prepare(`
      SELECT * FROM scores
      ORDER BY score DESC
      LIMIT 10
    `).all();

    // لو مفيش أي داتا في الجدول لسه
    if (scores.length === 0) {
      return ctx.reply('❌ لا توجد درجات أو لوحة شرف مسجلة حتى الآن. ابدأ بحل الكويز أولاً!');
    }

    // صياغة رسالة لوحة الشرف🏆
    let message = '🏆 لوحة شرف الطلاب (Top 10 Students)\n';
    message += '------------------------------------\n\n';

    scores.forEach((user, index) => {
      // إضافة إيموجي مميز للمراكز الثلاثة الأولى لزيادة الحماس🔥
      let medal = '🔹';
      if (index === 0) medal = '🥇';
      else if (index === 1) medal = '🥈';
      else if (index === 2) medal = '🥉';

      message += `${medal} المركز ${index + 1}: ${user.name} — 🎯 [${user.score} درجة]\n`;
    });

    message += '\n------------------------------------\n';
    message += '✨ بالتوفيق والنجاح لجميع الطلاب! 💪';

    await ctx.reply(message);

  } catch (error) {
    console.error('❌ Error in handleScores:', error.message);
    ctx.reply('❌ حدث خطأ أثناء جلب لوحة الشرف.');
  }
}

module.exports = {
  handleScores
};