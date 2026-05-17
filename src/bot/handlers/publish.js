const db = require('../../database/db');
const { getQuestions } = require('../../utils/storage');
const { Markup } = require('telegraf');

async function handlePublish(ctx) {
  try {
    const userId = ctx.from.id;
    const targetId = ctx.targetId;

    // جلب الأسئلة المخزنة
    const quizData = getQuestions(userId);
    if (!quizData) {
      return ctx.reply('❌ لا توجد أسئلة نشطة حالياً. يرجى رفع ملف .txt أولاً!');
    }

    const { lectureName: lectureTitle, questions } = quizData;

    // عرض القائمة الشفافة لو لم يتم اختيار هدف بعد
    if (!targetId) {
      const dynamicTargets = db.prepare('SELECT id, name FROM targets').all();

      if (dynamicTargets.length === 0) {
        return ctx.reply('📥 لا توجد جروبات أو قنوات مسجلة حالياً في الـ SQLite.\nأضف البوت كـ Admin في أي مكان ليظهر هنا تلقائياً!');
      }

      let menuText = `🎯 **اختر المكان المراد ضخ الكويز إليه لايف:**\n`;
      menuText += `------------------------------------\n`;
      menuText += `📚 المحاضرة الحالية: \`${lectureTitle}\`\n`;
      menuText += `📊 عدد الأسئلة: [ ${questions.length} سؤال ]`;

      const buttons = dynamicTargets.map(target => [
        Markup.button.callback(`📢 ${target.name}`, `publish_${target.id}`)
      ]);

      return ctx.reply(menuText, Markup.inlineKeyboard(buttons));
    }

    // رسالة البداية النظيفة والمصفاة تماماً
    await ctx.telegram.sendMessage(
      targetId,
      `📚 بداية كويز المحاضرة:\n\n🔥 ${lectureTitle} 🔥`
    );

    let sentCount = 0;

    for (const q of questions) {
      try {
        // 🎯 التعديل الاحترافي: جعل الـ Quiz مجهول بالكامل لحماية الأداء في الجروبات الكبيرة
        await ctx.telegram.sendPoll(
          targetId,
          `Q${sentCount + 1}) ${q.question}`,
          q.options,
          {
            type: 'quiz',
            correct_option_id: q.correct,
            is_anonymous: true // وضع التخفي الاحترافي النشط حالا 🕵️‍♂️🔥
          }
        );

        sentCount++;
        console.log(`⚡ [Quiz Engine] Sent Question [${sentCount}/${questions.length}].`);

        // الـ Smart Delay الآمن ضد الـ Rate Limits (4 ثواني)
        await new Promise(resolve => setTimeout(resolve, 4000));

      } catch (pollError) {
        console.error(`❌ Error sending poll at index ${sentCount}:`, pollError.message);
        
        // الـ Auto Retry الاحترافي لو تليجرام رخم بـ 429
        if (pollError.message.includes('429') || pollError.message.includes('retry after')) {
          const matchSeconds = pollError.message.match(/retry after (\d+)/i);
          const waitTime = matchSeconds ? parseInt(matchSeconds[1]) * 1000 : 9000;
          
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          await ctx.telegram.sendPoll(
            targetId,
            `Q${sentCount + 1}) ${q.question}`,
            q.options,
            { type: 'quiz', correct_option_id: q.correct, is_anonymous: true }
          );
          sentCount++;
          await new Promise(resolve => setTimeout(resolve, 4000));
        }
      }
    }

    // رسالة النهاية الرسمية والصافية تماماً بدون أي حشو
    await ctx.telegram.sendMessage(
      targetId,
      `✅ انتهت أسئلة محاضرة:\n\n${lectureTitle}`
    );

    // تأكيد الإتمام للأدمن في الخاص
    return ctx.telegram.sendMessage(userId, `🚀 **تم ضخ ونشر الـ [ ${sentCount} سؤال ] بنجاح كامل وبوضع التخفي النظيف!**`);

  } catch (error) {
    console.error('❌ Publish Handler Mega Error:', error.message);
    ctx.reply('❌ حدث خطأ غير متوقع أثناء ضخ ونشر الأسئلة.');
  }
}

module.exports = {
  handlePublish
};