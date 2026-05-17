const db = require('../../database/db');
const { setUploadSession } = require('../../utils/uploadSessions');

async function handleUploadFile(ctx) {
  const parts = ctx.message.text.split(' ');
  parts.shift(); // حذف الأمر نفسه (/upload_file)

  const text = parts.join(' ');
  const split = text.split('|');

  if (split.length < 2) {
    return ctx.reply('❌ استخدام خاطئ!\nيرجى استخدام الأمر بالشكل التالي:\n/upload_file اسم المادة | اسم المحاضرة');
  }

  const subjectName = split[0].trim();
  const lectureName = split[1].trim();

  try {
    // 1. البحث عن المادة في الداتابيز
    const subject = db.prepare(`
      SELECT * FROM subjects
      WHERE name = ?
    `).get(subjectName);

    if (!subject) {
      return ctx.reply(`❌ خطأ: المادة "${subjectName}" غير موجودة بالنظام. أضف المادة أولاً عبر /add_subject`);
    }

    // 2. البحث عن المحاضرة المرتبطة بالمادة
    // (ملحوظة: تأكد إن جدول lectures موجود ومغّذى في نظامك)
    const lecture = db.prepare(`
      SELECT * FROM lectures
      WHERE subject_id = ? AND name = ?
    `).get(subject.id, lectureName);

    if (!lecture) {
      return ctx.reply(`❌ خطأ: المحاضرة "${lectureName}" غير مسجلة تحت مادة ${subjectName}.`);
    }

    // 3. فتح الـ Session وتثبيت الـ State للأدمن
    setUploadSession(ctx.from.id, {
      lectureId: lecture.id,
      subjectName: subjectName,
      lectureName: lectureName
    });

    await ctx.reply(
      `📤 [جلسة الرفع نشطة]\n\n` +
      `📚 المادة: ${subjectName}\n` +
      `📖 المحاضرة: ${lectureName}\n\n` +
      `قم الآن بإرسال الملف فوراً (PDF, PPTX, MP3, إلخ...) كـ Document وسيقوم البوت بربطه تلقائياً! ⚡`
    );

  } catch (error) {
    console.error('❌ Error in handleUploadFile:', error.message);
    ctx.reply('❌ حدث خطأ غير متوقع أثناء فتح جلسة الرفع.');
  }
}

module.exports = {
  handleUploadFile
};