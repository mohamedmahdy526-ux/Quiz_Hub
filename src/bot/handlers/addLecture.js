const db = require('../../database/db');
const { Markup } = require('telegraf');
const { setSession } = require('../../utils/conversationSessions');

async function handleAddLecture(ctx) {
  try {
    // 1. سحب كل المواد المتاحة في الـ LMS لتوليد الأزرار ديناميكياً
    const subjects = db.prepare(`
      SELECT * FROM subjects
    `).all();

    // لو مفيش مواد لسه متكريتة في الدفتر
    if (subjects.length === 0) {
      return ctx.reply('❌ لا توجد مواد أكاديمية مسجلة بالنظام حالياً. يرجى إضافة مادة أولاً باستخدام أمر /add_subject');
    }

    // 2. مابينج للمواد وتحويلها لمصفوفة أزرار جاهزة للتليجرام
    const buttons = subjects.map(subject => [subject.name]);

    // 3. قنص وتثبيت الـ State للأدمن فوراً جوه الـ Engine
    setSession(ctx.from.id, {
      step: 'waiting_subject'
    });

    // 4. عرض المواد في الـ Dynamic Reply Keyboard
    await ctx.reply(
      '📚 [إضافة محاضرة جديدة - الخطوة 1]\n\n' +
      'يرجى اختيار المادة الأكاديمية المستهدفة من الأزرار بالأسفل 👇',
      Markup.keyboard(buttons).resize()
    );

  } catch (error) {
    console.error('❌ Error in handleAddLecture:', error.message);
    ctx.reply('❌ حدث خطأ غير متوقع أثناء فتح معالج المحاضرات.');
  }
}

module.exports = {
  handleAddLecture
};