const db = require('../../database/db');
const { Markup } = require('telegraf');

/**
 * محرك رندرة القوائم الشجرية التقليدية (Reply Keyboard LMS UI Engine)
 * @param {Object} ctx - الـ Context الخاص بـ Telegraf
 * @param {Number|null} parentId - آيدي العنصر الأب الحالي
 */
async function renderMenu(ctx, parentId = null, skipAutoSend = false) {
  try {
    const userId = String(ctx.from?.id);
    const isAdmin = userId === String(process.env.ADMIN_ID);

    // جلب العناصر المسجلة تحت هذا الأب
    const dbParentId = (parentId === 'root' || parentId === null) ? null : Number(parentId);

    const nodes = db.prepare(`
      SELECT * FROM nodes
      WHERE parent_id IS ?
      ORDER BY id ASC
    `).all(dbParentId);

    // فصل المجلدات عن الملفات والوسائط والكويزات
    const folderNodes = [];
    const nonFolderNodes = [];

    for (const node of nodes) {
      if (node.type === 'folder' || node.type === 'category') {
        folderNodes.push(node);
      } else {
        nonFolderNodes.push(node);
      }
    }

    // 1. إرسال جميع الملفات والوسائط تلقائياً للمستخدم في الشات (إذا لم يتم التخطي)
    if (!skipAutoSend) {
      for (const node of nonFolderNodes) {
        try {
          if (node.type === 'file') {
            await ctx.replyWithDocument(node.telegram_file_id, {
              caption: `📄 **الملف الأكاديمي:**\n📖 [ ${node.name} ]\n\n🏫 تمريض مكثف المنيا ✨`
            });
          } else if (node.type === 'audio') {
            await ctx.replyWithAudio(node.telegram_file_id, {
              caption: `🎧 **الشرح الصوتي:**\n📖 [ ${node.name} ]\n\n🏫 استماعاً موفقاً! ✨`
            });
          } else if (node.type === 'quiz') {
            await ctx.reply(
              `🧠 **كويز تفاعلي متاح:**\n` +
              `📖 العنوان: [ ${node.name} ]\n\n` +
              `اضغط على الزر بالأسفل لبدء حل هذا الكويز مباشرة! 👇`,
              Markup.inlineKeyboard([
                [Markup.button.callback("✍️ ابدأ حل الكويز الآن", `start_quiz_node_${node.id}`)]
              ])
            );
          } else if (node.type === 'photo') {
            await ctx.replyWithPhoto(node.telegram_file_id, {
              caption: `🖼️ **صورة توضيحية:**\n📖 [ ${node.name} ]\n\n🏫 تمريض مكثف المنيا ✨`
            });
          } else if (node.type === 'text') {
            await ctx.reply(
              `✍️ **توجيه/ملاحظة أكاديمية:**\n` +
              `━━━━━━━━━━━━━━━━━━━━\n` +
              `${node.name}\n\n` +
              `🏫 تمريض مكثف المنيا ✨`
            );
          }
          // إراحة خادم تليجرام قليلاً بين الإرسال المتتابع
          await new Promise((resolve) => setTimeout(resolve, 800));
        } catch (sendError) {
          console.error(`❌ Failed auto-sending node #${node.id} (${node.name}):`, sendError.message);
        }
      }
    }

    const keyboardRows = [];
    const nodeButtons = [];

    // 2. توليد أزرار التصفح للمجلدات فقط
    for (const node of folderNodes) {
      nodeButtons.push(`📁 ${node.name}`);
    }

    // تقسيم أزرار المحتوى إلى صفوف متساوية (كل صف به زرين) لتنسيق جمالي مريح بالهاتف
    for (let i = 0; i < nodeButtons.length; i += 2) {
      keyboardRows.push(nodeButtons.slice(i, i + 2));
    }

    // 3. أزرار الإدارة التفاعلية للأدمن فقط (إضافة وحذف في صف واحد لجمال المنظر)
    if (isAdmin) {
      keyboardRows.push(['➕ إضافة عنصر هنا', '⚙️ تعديل ونقل', '🗑️ حذف عنصر']);
    }

    // 4. أزرار الرجوع الذكية في كيبورد الرد التقليدي
    if (dbParentId !== null) {
      keyboardRows.push(['🔙 رجوع للخلف']);
    } else {
      keyboardRows.push(['🔙 رجوع للقائمة الرئيسية']);
    }

    // تحديد عنوان المجلد الحالي بشكل ديناميكي أنيق
    let currentFolderName = 'تمريض مكثف المنيا 🏫';
    if (dbParentId !== null) {
      const parentNode = db.prepare('SELECT name FROM nodes WHERE id = ?').get(dbParentId);
      if (parentNode) {
        currentFolderName = parentNode.name;
      }
    }

    // دالة هروب لرموز HTML لمنع أي توقف في الإرسال
    const escapeHtml = (text) => {
      if (!text) return '';
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    };

    const text = 
      `🏫 <b>تصفح: [ ${escapeHtml(currentFolderName)} ]</b>\n` +
      `------------------------------------\n` +
      `استخدم الأزرار بالأسفل للتنقل بين الأقسام والمحاضرات 👇`;

    const keyboard = Markup.keyboard(keyboardRows).resize();

    return await ctx.reply(text, {
      reply_markup: keyboard.reply_markup,
      parse_mode: 'HTML'
    });

  } catch (error) {
    console.error('❌ UI Engine Render Error:', error.message);
  }
}

module.exports = {
  renderMenu
};