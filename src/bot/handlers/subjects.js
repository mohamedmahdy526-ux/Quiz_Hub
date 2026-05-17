const db = require('../../database/db');

async function handleSubjects(ctx) {
  try {
    // جلب كل المواد بترتيب تنازلي (الأحدث أولاً)
    const subjects = db.prepare(`
      SELECT * FROM subjects
      ORDER BY id DESC
    `).all();

    // لو جدول المواد لسه فاضي ومفيش داتا
    if (subjects.length === 0) {
      return ctx.reply('❌ لا توجد مواد أكاديمية مسجلة في النظام حتى الآن.\nاستخدم أمر /add_subject لإضافة أول مادة!');
    }

    // صياغة رسالة عرض المواد 📚
    let message = '📚 المواد الأكاديمية المتاحة في المنصة:\n';
    message += '------------------------------------\n\n';

    subjects.forEach((subject, index) => {
      message += `📖 [${index + 1}] — ${subject.name}\n`;
    });

    message += '\n------------------------------------\n';
    message += `✨ إجمالي المواد المسجلة: ${subjects.length}`;

    await ctx.reply(message);

  } catch (error) {
    console.error('❌ Error in handleSubjects:', error.message);
    ctx.reply('❌ حدث خطأ غير متوقع أثناء جلب قائمة المواد.');
  }
}

module.exports = {
  handleSubjects
};