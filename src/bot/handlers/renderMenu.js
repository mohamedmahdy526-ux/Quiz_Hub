const db = require('../../database/db');
const { Markup } = require('telegraf');

/**
 * محرك رندرة القوائم الشجرية الموحد (LMS UI Engine)
 * @param {Object} ctx - الـ Context الخاص بـ Telegraf
 * @param {Number|null} parentId - آيدي العنصر الأب الحالي
 * @param {Boolean} edit - هل نقوم بتحديث نفس الرسالة أم إرسال رسالة جديدة؟
 */
async function renderMenu(ctx, parentId = null, edit = false) {
  try {
    // جلب العناصر المسجلة تحت هذا الأب (باستخدام IS لضمان عمل الـ NULL بالشكل الصحيح في SQLite)
    const nodes = db.prepare(`
      SELECT * FROM nodes
      WHERE parent_id IS ?
      ORDER BY id DESC
    `).all(parentId);

    const buttons = [];

    // 1. توليد أزرار التصفح لكل الـ Nodes الحالية
    for (const node of nodes) {
      let icon = '📁';
      if (node.type === 'quiz') icon = '📝';
      else if (node.type === 'file') icon = '📄';
      else if (node.type === 'audio') icon = '🎧';

      buttons.push([
        Markup.button.callback(`${icon} ${node.name}`, `open_${node.id}`)
      ]);
    }

    // 2. حقن زر الإدارة التفاعلي "➕ إضافة عنصر" تحت العناصر مباشرة
    buttons.push([
      Markup.button.callback('➕ إضافة عنصر هنا', `add_${parentId || 'root'}`)
    ]);

    // 3. حقن زرار الـ "🔙 رجوع" الذكي لو إحنا مش في الـ Root Level
    if (parentId !== null) {
      // جلب بيانات النود الحالية لمعرفة الأب الأعلى منها والرجوع إليه
      const currentNode = db.prepare('SELECT parent_id FROM nodes WHERE id = ?').get(parentId);
      const grandParentId = currentNode ? currentNode.parent_id : null;

      buttons.push([
        Markup.button.callback('🔙 رجوع للخلف', `back_${grandParentId || 'root'}`)
      ]);
    }

    const text = 
      `🌳 **متصفح المنصة الجامعية الشجرية**\n` +
      `------------------------------------\n` +
      `استخدم الأزرار الذكية للتنقل لايف جوه الأقسام والمحاضرات 👇`;

    // 🔄 الـ UI Switch Pattern: تحديث سينمائي لنفس الرسالة منعاً للـ Spam
    if (edit) {
      return await ctx.editMessageText(text, {
        reply_markup: Markup.inlineKeyboard(buttons).reply_markup
      });
    }

    // 📥 أول قذيفة تصفح (رسالة جديدة عند طلب /browse لأول مرة)
    return await ctx.reply(text, Markup.inlineKeyboard(buttons));

  } catch (error) {
    console.error('❌ UI Engine Render Error:', error.message);
  }
}

module.exports = {
  renderMenu
};