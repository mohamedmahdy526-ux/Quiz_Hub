const db = require('../../database/db');

async function handleAddSubject(ctx) {
  // تقسيم الرسالة بناءً على المسافات
  const parts = ctx.message.text.split(' ');

  // حذف الأمر نفسه (/add_subject) من المصفوفة
  parts.shift();

  // تجميع بقية الكلمات لتكوين اسم المادة بالكامل وتنظيف المسافات الزائدة
  const subjectName = parts.join(' ').trim();

  // لو الأدمن كتب الأمر فاضي بدون اسم المادة
  if (!subjectName) {
    return ctx.reply('❌ استخدام خاطئ!\nيرجى كتابة الأمر بالشكل التالي:\n/add_subject اسم المادة');
  }

  try {
    // إدخال المادة الجديدة في الداتابيز
    db.prepare(`
      INSERT INTO subjects (name)
      VALUES (?)
    `).run(subjectName);

    await ctx.reply(`✅ تم إضافة المادة بنجاح:\n📚 **${subjectName}**`);

  } catch (error) {
    // اصطياد خطأ تكرار الاسم الممسوك بقيد UNIQUE
    if (error.message.includes('UNIQUE')) {
      return ctx.reply('❌ خطأ: هذه المادة موجودة بالفعل في النظام!');
    }

    console.error('❌ Error in handleAddSubject:', error);
    ctx.reply('❌ حدث خطأ غير متوقع أثناء إضافة المادة.');
  }
}

module.exports = {
  handleAddSubject
};