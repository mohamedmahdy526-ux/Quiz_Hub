const db = require('../../database/db');
const { getUploadSession, clearUploadSession } = require('../../utils/uploadSessions');
const { handleUpload } = require('./upload'); // استدعاء معالج الكويزات القديم للـ Fallback

async function handleLectureFile(ctx, next) {
  const userId = ctx.from.id;
  const session = getUploadSession(userId);

  // 🛡️ لقطة الـ Routing الصايعة: لو مفيش session رفع ملفات نشطة، مرره فوراً لمعالج الكويزات التلقائي (.txt)
  if (!session) {
    return handleUpload(ctx); 
  }

  const file = ctx.message.document;
  if (!file) return;

  try {
    // تخزين الـ file_id الصافي في الداتابيز وربطه بالمحاضرة
    db.prepare(`
      INSERT INTO lecture_files (lecture_id, file_name, file_id, file_type)
      VALUES (?, ?, ?, ?)
    `).run(session.lectureId, file.file_name, file.file_id, 'document');

    // تصفير الـ Session فوراً بعد النجاح لإغلاق الجلسة بأمان
    clearUploadSession(userId);

    await ctx.reply(
      `✅ تم رفع وربط ملف المحاضرة بنجاح!\n\n` +
      `📄 الملف: ${file.file_name}\n` +
      `📚 المادة: ${session.subjectName}\n` +
      `📖 المحاضرة: ${session.lectureName}\n\n` +
      `الملف الآن مخزن بأمان عبر سيرفرات تليجرام وجاهز للعرض للطلاب! 🚀`
    );

  } catch (error) {
    console.error('❌ Error in handleLectureFile:', error.message);
    ctx.reply('❌ حدث خطأ أثناء حفظ ملف المحاضرة في الداتابيز.');
  }
}

module.exports = {
  handleLectureFile
};