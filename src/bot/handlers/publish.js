const fs = require("fs");
const path = require("path");
const { Markup } = require("telegraf");
const { getQuestions } = require("../../utils/storage");

const groupsFile = path.join(__dirname, "../../../groups.json");

// تحميل الجروبات من ملف JSON
function loadGroups() {
  if (!fs.existsSync(groupsFile)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(groupsFile));
}

// أمر /publish لبناء قائمة الأزرار الشفافة لايف
async function handlePublish(ctx) {
  try {
    const groups = loadGroups();

    if (!groups.length) {
      return ctx.reply("❌ لا توجد جروبات محفوظة");
    }

    // 🔘 اختيار الهدف من أزرار شفافة ديناميكية (جروبات، قنوات، أو خاص)
    const buttons = groups.map((group) => {
      return [
        Markup.button.callback(
          `${group.title} (${group.type === 'private' ? 'خاص 👤' : 'عام 📢'})`,
          `publish_${group.id}`
        )
      ];
    });

    return ctx.reply(
      "📡 اختر الجروب، القناة أو الشات الخاص للنشر:",
      Markup.inlineKeyboard(buttons)
    );

  } catch (err) {
    console.log("❌ Publish Menu Error:", err.message);
    return ctx.reply("❌ حدث خطأ في جلب قائمة الأهداف.");
  }
}

// تنفيذ عملية الضخ للهدف المحدد بعد الضغط على الزرار الشفاف
async function publishToGroup(ctx, groupId) {
  try {
    const userId = ctx.from.id;
    const quizData = getQuestions(userId);

    if (!quizData) {
      return ctx.reply("❌ ارفع ملف الأسئلة أولاً");
    }

    const groups = loadGroups();
    const target = groups.find(
      (g) => String(g.id) === String(groupId)
    );

    if (!target) {
      return ctx.reply("❌ الهدف المختار غير موجود في القائمة");
    }

    const { lectureName, questions } = quizData;

    // 1️⃣ 🎯 إضافة رسالة: جاري النشر الفورية للأدمن في الخاص
    await ctx.reply(
      `🚀 جاري نشر محاضرة:\n\n📚 ${lectureName}\n\n⏳ انتظر حتى اكتمال النشر...`
    );

    // 📚 رسالة بداية الكويز في الهدف المستهدف
    await ctx.telegram.sendMessage(
      target.id,
      `📚 ${lectureName}`
    );

    let count = 0;

    for (const q of questions) {
      try {
        // 🎯 ترقيم الأسئلة تلقائياً Q1, Q2... + 👀 إخفاء المشاركين (is_anonymous: true)
        await ctx.telegram.sendPoll(
          target.id,
          `Q${count + 1}) ${q.question}`,
          q.options,
          {
            type: "quiz",
            correct_option_id: q.correct,
            is_anonymous: true
          }
        );

        count++;
        console.log(`✅ Sent ${count}/${questions.length} -> ${target.title}`);

        // ⏳ Anti-429 delay: الانتظار التكتيكي (4 ثواني) بين كل سؤال وسؤال
        await new Promise((r) => setTimeout(r, 4000));

      } catch (pollError) {
        console.error(`❌ Error sending poll at index ${count}:`, pollError.message);
        
        // 🔥 محرك الـ Auto Retry الذكي لو Telegram عمل Rate Limit (429)
        if (pollError.message.includes('429') || pollError.message.includes('retry after')) {
          const matchSeconds = pollError.message.match(/retry after (\d+)/i);
          const waitTime = matchSeconds ? parseInt(matchSeconds[1]) * 1000 : 9000;
          
          console.log(`⚠️ [Rate Limit Caught] Sleeping for ${waitTime / 1000} seconds before retrying...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          await ctx.telegram.sendPoll(
            target.id,
            `Q${count + 1}) ${q.question}`,
            q.options,
            { type: "quiz", correct_option_id: q.correct, is_anonymous: true }
          );
          count++;
          await new Promise(resolve => setTimeout(resolve, 4000));
        }
      }
    }

    // 📚 اسم المحاضرة في النهاية جوه هدف النشر
    await ctx.telegram.sendMessage(
      target.id,
      `✅ انتهت أسئلة ${lectureName}`
    );

    // 2️⃣ 🎯 التعديل الفخم: رسالة عند انتهاء النشر مفصلة للأدمن
    return ctx.reply(
      `✅ اكتمل نشر محاضرة:\n\n📚 ${lectureName}\n\n🎯 عدد الأسئلة: ${questions.length}`
    );

  } catch (err) {
    console.log("❌ Publish Error:", err.message);
    return ctx.reply("❌ حدث خطأ غير متوقع أثناء ضخ الكويز.");
  }
}

module.exports = {
  handlePublish,
  publishToGroup
};