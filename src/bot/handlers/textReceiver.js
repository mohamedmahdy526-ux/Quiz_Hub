const db = require('../../database/db');
const { getSession, clearSession } = require('../../utils/conversationSessions');
const { parseQuestions } = require('../../engine/parser');

async function handleIncomingTextAndFiles(ctx) {
  // حماية الاستقبال للأدمن فقط لعمليات الـ Stateful Forms
  if (String(ctx.from.id) !== String(process.env.ADMIN_ID)) return;

  const session = getSession(ctx.from.id);
  if (!session) return; // مفيش فورم مفتوحة حالياً

  // 1. حالة إضافة نود رئيسية (Root Node)
  if (session.step === 'waiting_root_name') {
    const name = ctx.message.text.trim();
    db.prepare("INSERT INTO nodes (name, type, parent_id) VALUES (?, 'category', NULL)").run(name);
    clearSession(ctx.from.id);
    return ctx.reply(`✅ تم إنشاء القسم الرئيسي بنجاح: ${name}\nاكتب /browse لرؤيته.`);
  }

  // 2. حالة إضافة عنصر فرعي (Child Node)
  if (session.step === 'waiting_child_name') {
    const name = ctx.message.text.trim();
    // تصفير وافتراض أن النوع مادة أو محاضرة حسب العمق
    db.prepare("INSERT INTO nodes (name, type, parent_id) VALUES (?, 'subject', ?)").run(name, session.parentId);
    clearSession(ctx.from.id);
    return ctx.reply(`✅ تم إضافة الكيان الفرعي بنجاح: ${name}`);
  }

  // 3. حالة رفع ملف (PDF, MP3, PPTX)
  if (session.step === 'waiting_file' && ctx.message.document) {
    const file = ctx.message.document;
    let type = file.file_name.endsWith('.mp3') || file.file_name.endsWith('.wav') ? 'audio' : 'file';

    db.prepare("INSERT INTO nodes (name, type, parent_id, telegram_file_id) VALUES (?, ?, ?, ?)")
      .run(file.file_name, type, session.parentId, file.file_id);
    
    clearSession(ctx.from.id);
    return ctx.reply(`✅ تم استقبال وربط ملف المحاضرة بنجاح الشجرة: ${file.file_name}`);
  }

  // 4. حالة رفع كويز وفكه شجرياً وضخه تلقائياً في الجروب
  if (session.step === 'waiting_quiz' && ctx.message.document) {
    const file = ctx.message.document;
    if (!file.file_name.endsWith('.txt')) return ctx.reply('❌ يرجى رفع ملف أسئلة بصيغة .txt فقط.');

    try {
      const fileLink = await ctx.telegram.getFileLink(file.file_id);
      const response = await fetch(fileLink.href);
      const text = await response.text();
      const questions = parseQuestions(text);

      if (!questions || questions.length === 0) return ctx.reply('❌ فشل تفكيك الأسئلة، تأكد من صياغة الملف.');

      // إنشاء نود للكويز
      const result = db.prepare("INSERT INTO nodes (name, type, parent_id) VALUES (?, 'quiz', ?)")
        .run(file.file_name, session.parentId);
      
      clearSession(ctx.from.id);
      ctx.reply(`🎉 تم استخراج ${questions.length} سؤال وربط كويز شجري بنجاح!\nجاري بدء النشر الآمن في الخلفية... 🚀`);

      // تشغيل الـ Async Background Builder المريح لـ تليجرام ⚡
      setImmediate(async () => {
        let sent = 0;
        for (const [index, question] of questions.entries()) {
          try {
            if (question.options.length > 10 || question.question.length > 300) continue;

            const sentPoll = await ctx.telegram.sendPoll(ctx.chat.id, question.question, question.options, {
              type: 'quiz',
              correct_option_id: question.correct,
              is_anonymous: false
            });

            // تخزين الـ mapping الخاص بالـ Poll ID مع الإجابة الصح شجرياً
            db.prepare("INSERT INTO polls (poll_id, correct_option) VALUES (?, ?)").run(sentPoll.poll.id, question.correct);
            sent++;
            await new Promise(res => setTimeout(res, 5000)); // ديليه الأمان النظيف
          } catch (err) {
            console.error(`Error sending text-quiz-node item ${index}:`, err.message);
          }
        }
        await ctx.reply(`🏁 اكتمل ضخ أسئلة كويز الـ Node بنجاح. تم إرسال ${sent} سؤال.`);
      });

    } catch (err) {
      ctx.reply('❌ حدث خطأ أثناء معالجة الكويز.');
    }
  }
}

module.exports = {
  handleIncomingTextAndFiles
};