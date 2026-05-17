const { parseQuestions } = require('../../utils/parser');
const { saveQuestions } = require('../../utils/storage');
const { cleanText } = require('../../utils/formatter'); // 🎯 استدعاء حارس التطهير التلقائي الجديد

async function handleUpload(ctx) {
  try {
    const fileId = ctx.message.document.file_id;
    const fileName = ctx.message.document.file_name;
    const userId = ctx.from.id;

    // تطهير امتداد الملف وزوائد الـ Copy الخاصة بالويندوز لايف
    const lectureTitle = fileName
      .replace('.txt', '')
      .replace(/- Copy(\s*\(\d+\))?/gi, '')
      .trim();

    // جلب الرابط المباشر من سيرفرات تليجرام وقراءته فوراً
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const response = await fetch(fileLink.href);
    let textContent = await response.text();

    // 🎯 الترقية الذهبية الكبرى: تطهير وتصليح صيغة الملف تلقائياً قبل الـ Parsing
    textContent = cleanText(textContent);

    // تفكيك واستخراج مصفوفة الأسئلة من النص المغسول
    const questions = parseQuestions(textContent);

    if (!questions.length) {
      return ctx.reply(
        '❌ فشل استخراج الأسئلة.. تأكد من صياغة بنك الأسئلة داخل الملف والـ Format المطلوب.'
      );
    }

    // حفظ البيانات في الـ Storage والـ Session لمنع أي سقوط للداتا
    if (!ctx.session) ctx.session = {};
    ctx.session.questions = questions;
    ctx.session.lectureTitle = lectureTitle;

    saveQuestions(userId, {
      lectureName: lectureTitle,
      questions
    });

    // رد البوت الرسمي والنظيف بعد رفع الملف مباشرة
    await ctx.reply(
      `✅**تم استخراج وقفل أسئلة المحاضرة بنجاح!**\n\n` +
      `📚 المحاضرة:\n${lectureTitle}\n\n` +
      `📊 عدد الأسئلة:\n[ ${questions.length} سؤال ]\n\n` +
      `📤 اكتب الآن:\n/publish\n\n` +
      `لاختيار مكان النشر 🔥`,
      {
        parse_mode: 'Markdown'
      }
    );

  } catch (error) {
    console.error('❌ Upload Handler Error:', error.message);
    ctx.reply('❌ حدث خطأ أثناء معالجة وقراءة ملف الأسئلة.');
  }
}

module.exports = {
  handleUpload
};