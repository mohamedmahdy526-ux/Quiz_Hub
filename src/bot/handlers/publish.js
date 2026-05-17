const fs = require("fs");
const path = require("path");
const { Markup } = require("telegraf");
const { getQuestions } = require("../../utils/storage");

const groupsFile = path.join(__dirname, "../../../groups.json");

// تحميل الجروبات من ملف JSON
function loadGroups() {
  if (!fs.existsSync(groupsFile)) {
    return {};
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(groupsFile, "utf8"));
    return Array.isArray(parsed) ? {} : parsed;
  } catch (e) {
    return {};
  }
}

// أمر /publish لبناء قائمة الأزرار الشفافة لايف
async function handlePublish(ctx) {
  try {
    const groupsObject = loadGroups();
    const groupsArray = Object.values(groupsObject);

    if (!groupsArray.length) {
      return ctx.reply("❌ لا توجد أهداف أو جروبات محفوظة");
    }

    // إنشاء الأزرار الشفافة: تمييز الخاص عن العام بالـ Emojis والأسماء النظيفة
    const buttons = groupsArray.map((group) => {
      const label = group.type === "private"
        ? `👤 ${group.title} (خاص)`
        : `📢 ${group.title} (عام)`;

      return [
        Markup.button.callback(label, `publish_${group.id}`)
      ];
    });

    return ctx.reply(
      "📡 اختر المكان المراد ضخ الكويز إليه:",
      Markup.inlineKeyboard(buttons)
    );

  } catch (err) {
    console.log("❌ Publish Menu Error:", err.message);
    return ctx.reply("❌ حدث خطأ أثناء جلب قائمة الأهداف.");
  }
}

// تنفيذ عملية الضخ بعد لقط الـ ID الصافي من الـ Regex
async function publishToGroup(ctx, groupId) {
  try {
    const userId = ctx.from.id;
    const quizData = getQuestions(userId);

    if (!quizData) {
      return ctx.reply("❌ ارفع ملف الأسئلة أولاً");
    }

    const groupsObject = loadGroups();
    const target = groupsObject[String(groupId)];

    if (!target) {
      return ctx.reply("❌ الهدف المختار غير موجود في القائمة");
    }

    const { lectureName, questions } = quizData;

    // 🎯 التعديل الفخم والجديد: إظهار اسم المحاضرة مع عدد الأسئلة الإجمالي للأدمن قبل النشر لايف
    await ctx.reply(
      `🚀 جاري نشر محاضرة:\n\n📚 ${lectureName}\n🎯 عدد الأسئلة الإجمالي: ${questions.length}\n\n⏳ انتظر حتى اكتمال النشر تماماً...`
    );

    // رسالة بداية الكويز في الهدف المستهدف
    await ctx.telegram.sendMessage(
      target.id,
      `📚 ${lectureName}`
    );

    let count = 0;

    for (const q of questions) {
      try {
        // ترقيم الأسئلة تلقائياً Q1, Q2... + إخفاء المشاركين (is_anonymous: true) لحماية الأداء
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
        
        // Anti-429 delay: الانتظار التكتيكي (4 ثواني) بين كل سؤال وسؤال
        await new Promise((r) => setTimeout(r, 4000));

      } catch (pollError) {
        if (pollError.message.includes('429') || pollError.message.includes('retry after')) {
          const matchSeconds = pollError.message.match(/retry after (\d+)/i);
          const waitTime = matchSeconds ? parseInt(matchSeconds[1]) * 1000 : 9000;
          
          console.log(`⚠️ [Rate Limit Caught] Sleeping for ${waitTime / 1000} seconds...`);
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

    // رسالة نهاية الكويز في الهدف المستهدف
    await ctx.telegram.sendMessage(
      target.id,
      `✅ انتهت أسئلة ${lectureName}`
    );

    // رسالة عند انتهاء النشر مفصلة للأدمن في الخاص
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