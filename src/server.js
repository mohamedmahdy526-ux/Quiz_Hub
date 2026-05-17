require('dotenv').config();

// 🛡️ الـ Pre-Flight Architecture Protection: حماية البيئة قبل تشغيل البوت
if (!process.env.BOT_TOKEN) {
  console.error('💥 FATAL ERROR: BOT_TOKEN is missing in .env file!');
  process.exit(1);
}

if (!process.env.ADMIN_ID) {
  console.error('💥 FATAL ERROR: ADMIN_ID is missing in .env file!');
  process.exit(1);
}

// تشغيل الـ Schema لضمان سلامة الداتابيز
require('./database/schema');

const bot = require('./bot/index');

bot.launch().then(() => {
  console.log('✔ Ultimate Simple Quiz Bot is online and ready safely! 🚀');
}).catch((error) => {
  console.error('💥 Fatal error launching the bot:', error.message);
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));