const { Telegraf } = require("telegraf");
const fs = require("fs");
const path = require("path");

// 🎯 التصليح الفولاذي: فصل الاستدعاءات صح عشان الكود ميهنجش ولا يسقط رسايل
const { handleUpload } = require("./handlers/upload");
const { handlePublish, publishToGroup } = require("./handlers/publish");

const bot = new Telegraf(process.env.BOT_TOKEN);
const adminId = process.env.ADMIN_ID;

const groupsFile = path.join(__dirname, "../../groups.json");

// تحميل الجروبات
function loadGroups() {
  if (!fs.existsSync(groupsFile)) {
    fs.writeFileSync(groupsFile, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(groupsFile));
}

// حفظ الجروبات
function saveGroups(groups) {
  fs.writeFileSync(groupsFile, JSON.stringify(groups, null, 2));
}

// 🤖 حارس قنص الأهداف: بيسجل الخاص، الجروبات، والقنوات تلقائياً فوراً!
bot.on("message", async (ctx, next) => {
  try {
    const chat = ctx.chat;

    if (
      chat &&
      (chat.type === "private" ||
        chat.type === "group" ||
        chat.type === "supergroup" ||
        chat.type === "channel")
    ) {
      let groups = loadGroups();
      const exists = groups.find((g) => g.id === chat.id);

      if (!exists) {
        const chatTitle = chat.type === "private" 
          ? `👤 الخاص الخاص بك (${chat.first_name || 'Admin'})` 
          : chat.title;

        groups.push({
          id: chat.id,
          title: chatTitle,
          type: chat.type
        });

        saveGroups(groups);
        console.log(`✅ Saved New Target [${chat.type}]: ${chatTitle}`);
      }
    }
  } catch (err) {
    console.log("❌ Auto Save Error:", err.message);
  }
  return next();
});

bot.start((ctx) => {
  if (ctx.chat.type !== "private") return;
  ctx.reply("🚀 ارفع ملف الأسئلة TXT ثم استخدم /publish");
});

// استقبال ورفع ملفات الأسئلة (للأدمن فقط وفي الخاص) 🔐❌
bot.on("document", async (ctx) => {
  if (ctx.chat.type !== "private") return; 
  if (String(ctx.from.id) !== String(adminId)) return ctx.reply("❌ عذراً، هذا البوت مخصص للإشراف الأكاديمي فقط!");
  return handleUpload(ctx);
});

// أمر النشر (للأدمن فقط وفي الخاص) 🔐❌
bot.command("publish", async (ctx) => {
  if (ctx.chat.type !== "private") return;
  if (String(ctx.from.id) !== String(adminId)) return ctx.reply("❌ للأدمن فقط");
  return handlePublish(ctx);
});

// التقاط كليكة الزرار الشفاف وضخ الكويز للهدف المختار
bot.action(/publish_(.+)/, async (ctx) => {
  try {
    const groupId = ctx.match[1];
    await ctx.answerCbQuery();
    return publishToGroup(ctx, groupId);
  } catch (err) {
    console.log("❌ Action Error:", err.message);
  }
});

module.exports = bot;