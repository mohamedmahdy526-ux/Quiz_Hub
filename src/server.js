require("dotenv").config(); // شحن البيئة المحيطة والـ Tokens فوراً
const bot = require("./bot/index"); // استدعاء كائن البوت المطهر
const commands = require("./bot/commands"); // استيراد الأوامر الفعالة
const http = require("http");

// 🌐 سيرفر ويب بسيط لتجاوز فحص الصحة (Health Check) في الاستضافة ومنع السقوط بـ SIGTERM
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bot is running!\n");
}).listen(PORT, () => {
  console.log(`✔ Web health check server listening on port ${PORT}`);
});

// 🎯 قفل اللعبة هنا: الـ Launch الفريد والوحيد المعتمد على مستوى السيستم بالكامل مع معالجة التعارض 409
function launchBot(retries = 5) {
  bot.launch({
    allowedUpdates: [
      "message",
      "callback_query",
      "poll_answer",
      "poll"
    ]
  }).then(() => {
    console.log("🤖 Telegram Quiz Bot is fully launched with Deep Allowed Updates! [ACTIVE]");
    
    // تسجيل الأوامر الفعالة تلقائياً لتظهر للمستخدم في قائمة التليجرام الشفافة
    bot.telegram.setMyCommands(commands)
      .then(() => {
        console.log("✔ Bot commands set successfully in Telegram UI.");
      })
      .catch((err) => {
        console.error("❌ Failed to set Telegram commands:", err.message);
      });
  }).catch((err) => {
    console.error("❌ Launch Critical Error:", err.message);
    
    // إذا كان الخطأ تعارض 409 (نسخة أخرى تعمل أثناء الـ Deploy)، ننتظر ونحاول مجدداً
    if (err.message && err.message.includes("409") && retries > 0) {
      console.log(`⏳ [409 Conflict] النسخة القديمة لا تزال تعمل. إعادة المحاولة بعد 5 ثوانٍ... (المحاولات المتبقية: ${retries})`);
      setTimeout(() => launchBot(retries - 1), 5000);
    } else {
      console.error("💥 Felled to start bot after retries. Exiting...");
      process.exit(1);
    }
  });
}

launchBot();

// تفعيل الـ Graceful Shutdown لإغلاق آمن وحماية الـ File Streams
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));