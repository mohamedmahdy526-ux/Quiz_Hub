const db = require('../../database/db');

async function handleAddNode(ctx) {
  // تقسيم الرسالة بناءً على المسافات
  const parts = ctx.message.text.split(' ');
  parts.shift(); // حذف الأمر نفسه (/add_node)

  const text = parts.join(' ').trim();

  // تفكيك المدخلات بناءً على علامة الـ pipe |
  const split = text.split('|');

  if (split.length < 2) {
    return ctx.reply('❌ استخدام خاطئ!\nيرجى استخدام الأمر بالشكل التالي:\n\n/add_node type | name\n\n💡 مثال:\n/add_node category | الفرقة الثالثة');
  }

  const type = split[0].trim().toLowerCase(); // تحويل النوع لـ lowercase لتوحيد الداتا
  const name = split[1].trim();

  try {
    // إدخال الـ Node الجديدة في شجرة الداتابيز (تأخذ parent_id كـ NULL افتراضياً لأنها Root)
    db.prepare(`
      INSERT INTO nodes (name, type, parent_id)
      VALUES (?, ?, NULL)
    `).run(name, type);

    await ctx.reply(
      `🌲 [تم إنشاء Node جديدة بنجاح]\n\n` +
      `📂 الاسم: ${name}\n` +
      `🧩 النوع: ${type}\n` +
      `📌 الموقع: Root Node (مستوى رئيسي)`
    );

  } catch (error) {
    console.error('❌ Error in handleAddNode:', error.message);
    ctx.reply('❌ حدث خطأ غير متوقع أثناء إنشاء الـ Node.');
  }
}

module.exports = {
  handleAddNode
};