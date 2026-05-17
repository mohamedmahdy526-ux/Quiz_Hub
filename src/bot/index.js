const { Telegraf } = require('telegraf');
const { handleUpload } = require('./handlers/upload');
const { handlePublish } = require('./handlers/publish');
const { handleTargetsList, handleTargetDelete } = require('./handlers/targets');

const bot = new Telegraf(process.env.BOT_TOKEN);
const adminId = process.env.ADMIN_ID;

bot.start((ctx) => {
  if (ctx.chat.type !== 'private') return;
  ctx.reply('🚀 مرحبًا بك في منصة الاختبارات السريعة الصافية.\nارفع ملف الـ .txt الخاص بالأسئلة الآن!');
});

// أمر إدارة الأهداف المحمي للأدمن فقط 🔐
bot.command('targets', async (ctx) => {
  if (String(ctx.from.id) !== String(adminId)) return ctx.reply('❌ للأدمن فقط!');
  return handleTargetsList(ctx);
});

// لقطة زرار الحذف الفوري من قاعدة البيانات SQLite
bot.action(/rem_tgt_(.+)/, handleTargetDelete);

// أمر النشر للأدمن فقط
bot.command('publish', async (ctx) => {
  if (String(ctx.from.id) !== String(adminId)) return ctx.reply('❌ للأدمن فقط!');
  return handlePublish(ctx);
});

// محرك الـ Inline Action لضخ الكويزات عن بُعد من الخاص
bot.action(/publish_(.+)/, async (ctx) => {
  try {
    const targetId = ctx.match[1];
    await ctx.answerCbQuery(); 
    ctx.targetId = targetId;
    return await handlePublish(ctx);
  } catch (err) {
    console.log('❌ Publish Action Error:', err.message);
  }
});

// حارس استقبال ملفات الأسئلة - صارم ومقفل على الـ .txt فقط لضمان أعلى درجات الثبات دائمًا 🎯
bot.on('document', async (ctx) => {
  if (String(ctx.from.id) !== String(adminId)) return;
  
  const fName = ctx.message.document.file_name;
  if (!fName.endsWith('.txt')) {
    return ctx.reply('❌ عذراً، المنصة تقبل ملفات بنوك الأسئلة بصيغة .txt فقط لضمان استقرار النشر!');
  }
  
  return handleUpload(ctx);
});

// حارس لقطة وحفظ الجروبات التلقائي في الـ SQLite (Auto Saving Targets)
bot.on('message', async (ctx, next) => {
  try {
    const chat = ctx.chat;
    if (chat.type === 'group' || chat.type === 'supergroup') {
      const db = require('../database/db');
      db.prepare(`
        INSERT INTO targets (id, name, type) VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET name = excluded.name
      `).run(chat.id.toString(), chat.title, chat.type);
    }
  } catch (error) {
    console.error('❌ Auto Save Error:', error.message);
  }
  return next();
});

// لمنع تعليق زرار اسم الجروب الشفاف
bot.action('noop', async (ctx) => {
  await ctx.answerCbQuery();
});

module.exports = bot;