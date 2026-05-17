const db = require('../../database/db');
const { Markup } = require('telegraf');

// 📊 1. عرض قائمة الجروبات والقنوات المربوطة حالياً
async function handleTargetsList(ctx) {
  try {
    const userId = ctx.from.id;

    // جلب الأهداف لايف من الـ SQLite
    const dynamicTargets = db.prepare('SELECT id, name FROM targets').all();

    if (dynamicTargets.length === 0) {
      return ctx.telegram.sendMessage(userId, '📥 **لا توجد جروبات أو قنوات مسجلة في النظام حالياً.**');
    }

    let listText = `🛠️ **مدير الأهداف المربوطة (Target Manager Lite)**\n`;
    listText += `------------------------------------\n\n`;
    listText += `إليك الأماكن النشطة حالياً في قاعدة البيانات.\n`;
    listText += `استخدم الأزرار بالأسفل لحذف أي مكان فوراً ومنع النشر إليه 👇`;

    const buttons = [];

    dynamicTargets.forEach(target => {
      // زرار يحمل اسم الجروب، وجنبه زرار الحذف الخاص بـ الـ ID بتاعه
      buttons.push([
        Markup.button.callback(`📍 ${target.name}`, 'noop'),
        Markup.button.callback('🗑️ حذف', `rem_tgt_${target.id}`)
      ]);
    });

    return ctx.telegram.sendMessage(userId, listText, Markup.inlineKeyboard(buttons));

  } catch (error) {
    console.error('❌ Targets List Error:', error.message);
  }
}

// 🗑️ 2. معالج الحذف الفوري والمباشر من قاعدة البيانات
async function handleTargetDelete(ctx) {
  try {
    const userId = ctx.from.id;
    const targetId = ctx.match[1]; // قنص الـ ID المستخرج عبر الـ Regex

    // حذف الهدف من الـ SQLite في ثانية
    db.prepare('DELETE FROM targets WHERE id = ?').run(targetId);

    // قفل لودينج الساعة من على الزرار الشفاف
    await ctx.answerCbQuery('🗑️ تم الحذف والتطهير بنجاح!');

    // تعديل الرسالة الحالية لتأكيد الحذف بنجاح
    await ctx.editMessageText('✅ **تم مسح وحذف المكان من قاعدة البيانات بنجاح!**\nاكتب أمر /targets مجدداً لعرض القائمة المحدثة.');

  } catch (error) {
    console.error('❌ Target Delete Error:', error.message);
  }
}

module.exports = {
  handleTargetsList,
  handleTargetDelete
};