const { Markup } = require('telegraf');
const { setSession, getSession } = require('../../utils/conversationSessions');
const { renderMenu } = require('./renderMenu');
const db = require('../../database/db');

/**
 * معالجة النقر على "➕ إضافة عنصر هنا" للأدمن عبر كيبورد الرد
 */
async function handleAddClick(ctx) {
  try {
    const userId = String(ctx.from.id);

    // التأكد الصارم من أن المستخدم هو الأدمن
    if (userId !== String(process.env.ADMIN_ID)) {
      return ctx.reply('❌ عذراً، هذه اللوحة مخصصة للأدمن فقط!');
    }

    const session = getSession(userId);
    const parentId = session ? session.currentFolderId : 'root';
    const dbParentId = parentId === 'root' ? null : Number(parentId);

    const buttons = [
      ['📁 مجلد فرعي', '📄 ملف PDF'],
      ['🎧 تسجيل صوتي', '📝 كويز تفاعلي'],
      ['🖼️ صورة توضيحية', '✍️ رسالة نصية'],
      ['❌ إلغاء العملية']
    ];

    // ضبط الجلسة وتمرير خطوة الانتظار المحددة للأدمن
    setSession(userId, {
      currentFolderId: parentId, // حفظ المجلد الحالي للرجوع إليه لاحقاً
      step: 'waiting_type',
      parentId: dbParentId
    });

    await ctx.reply(
      `🛠️ **باني المنصة المرئي (Visual LMS Builder)**\n` +
      `------------------------------------\n` +
      `📌 المجلد الأب الحالي: \`${parentId === 'root' ? 'المستوى الرئيسي (Root)' : 'معرف #' + parentId}\`\n\n` +
      `الرجاء اختيار نوع العنصر الذي ترغب في إضافته بالأسفل 👇`,
      {
        parse_mode: 'Markdown',
        ...Markup.keyboard(buttons).resize()
      }
    );

  } catch (error) {
    console.error('❌ Error in handleAddClick:', error.message);
  }
}

/**
 * معالجة اختيار نوع العنصر لبدء جلسة استقبال البيانات
 */
async function handleSelectType(ctx, typeText) {
  try {
    const userId = String(ctx.from.id);
    if (userId !== String(process.env.ADMIN_ID)) return;

    const session = getSession(userId);
    if (!session || session.step !== 'waiting_type') return;

    let step = 'waiting_folder_name';
    let promptMsg = '';

    if (typeText.includes('مجلد')) {
      step = 'waiting_folder_name';
      promptMsg = 
        `📁 **إضافة مجلد جديد (ترم / مادة / محاضرة)**\n` +
        `------------------------------------\n` +
        `✍️ أرسل الآن اسم المجلد باللغة العربية (مثال: الترم الأول، مادة التشريح، محاضرة 1):`;
    } else if (typeText.includes('ملف')) {
      step = 'waiting_file';
      promptMsg = 
        `📄 **رفع ملف PDF (كتاب / ملخص)**\n` +
        `------------------------------------\n` +
        `📤 أرسل الآن ملف الـ PDF كـ Document وسيقوم البوت بحفظه وتسميته تلقائياً باسم الملف الأصلي!`;
    } else if (typeText.includes('صوت')) {
      step = 'waiting_audio';
      promptMsg = 
        `🎧 **رفع تسجيل صوتي (شرح)**\n` +
        `------------------------------------\n` +
        `📤 أرسل الآن الملف الصوتي (MP3 أو Voice) وسيقوم البوت بحفظه وعرضه للطلاب!`;
    } else if (typeText.includes('كويز')) {
      step = 'waiting_quiz';
      promptMsg = 
        `📝 **رفع كويز تفاعلي شجري (.txt)**\n` +
        `------------------------------------\n` +
        `📤 أرسل الآن ملف الأسئلة بصيغة \`.txt\` المعتمدة وسيقوم المحرك بتوليد الكويز ونشره تلقائياً!`;
    } else if (typeText.includes('صورة')) {
      step = 'waiting_photo';
      promptMsg = 
        `🖼️ **رفع صورة توضيحية / مخطط طبي**\n` +
        `------------------------------------\n` +
        `📤 أرسل الآن الصورة (Photo) وسيقوم البوت بحفظها وعرضها للطلاب!`;
    } else if (typeText.includes('رسالة') || typeText.includes('ملاحظة')) {
      step = 'waiting_text_message';
      promptMsg = 
        `✍️ **كتابة رسالة نصية / إرشاد أكاديمي**\n` +
        `------------------------------------\n` +
        `✍️ أرسل الآن نص الرسالة أو التوجيه الذي ترغب في حفظه وعرضه للطلاب داخل هذا المجلد:`;
    }

    // تحديث الجلسة بالخطوة الجديدة
    setSession(userId, {
      currentFolderId: session.currentFolderId,
      parentId: session.parentId,
      step: step
    });

    await ctx.reply(promptMsg, {
      parse_mode: 'Markdown',
      ...Markup.keyboard([['❌ إنهاء والعودة للتصفح']]).resize()
    });

  } catch (error) {
    console.error('❌ Error in handleSelectType:', error.message);
  }
}

/**
 * معالجة إلغاء عملية الرفع والرجوع الآمن للتصفح
 */
async function handleCancelAdd(ctx) {
  try {
    const userId = String(ctx.from.id);
    if (userId !== String(process.env.ADMIN_ID)) return;
    
    const session = getSession(userId);
    const currentFolderId = session ? session.currentFolderId : 'root';

    // إعادة تعيين الجلسة لحالة التصفح العادية
    setSession(userId, {
      currentFolderId: currentFolderId
    });

    await ctx.reply('❌ تم إلغاء جلسة إضافة العناصر والرجوع للتصفح.');
    return renderMenu(ctx, currentFolderId, true);
  } catch (error) {
    console.error('❌ Error in handleCancelAdd:', error.message);
  }
}

/**
 * معالجة النقر على "🗑️ حذف عنصر" للأدمن عبر كيبورد الرد
 */
async function handleDeleteClick(ctx) {
  try {
    const userId = String(ctx.from.id);
    if (userId !== String(process.env.ADMIN_ID)) {
      return ctx.reply('❌ عذراً، هذه اللوحة مخصصة للأدمن فقط!');
    }

    const session = getSession(userId);
    const parentId = session ? session.currentFolderId : 'root';
    const dbParentId = parentId === 'root' ? null : Number(parentId);

    const nodes = db.prepare(`
      SELECT * FROM nodes
      WHERE parent_id IS ?
      ORDER BY id ASC
    `).all(dbParentId);

    if (nodes.length === 0) {
      return ctx.reply('⚠️ لا توجد أي عناصر داخل هذا المجلد لحذفها حالياً!');
    }

    const inlineButtons = [];
    for (const node of nodes) {
      let icon = '📁';
      if (node.type === 'quiz') icon = '📝';
      else if (node.type === 'file') icon = '📄';
      else if (node.type === 'audio') icon = '🎧';
      else if (node.type === 'category') icon = '📁';
      else if (node.type === 'photo') icon = '🖼️';
      else if (node.type === 'text') icon = '✍️';

      inlineButtons.push([
        Markup.button.callback(`🗑️ ${icon} ${node.name}`, `confirm_del_${node.id}`)
      ]);
    }

    inlineButtons.push([
      Markup.button.callback('❌ إلغاء عملية الحذف', 'cancel_del')
    ]);

    await ctx.reply(
      `🗑️ **لوحة حذف العناصر والملفات**\n` +
      `------------------------------------\n` +
      `📌 المجلد الحالي: \`${parentId === 'root' ? 'المستوى الرئيسي (Root)' : 'معرف #' + parentId}\`\n\n` +
      `الرجاء الضغط على العنصر الذي ترغب في حذفه نهائياً من القائمة بالأسفل 👇`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(inlineButtons)
      }
    );

  } catch (error) {
    console.error('❌ Error in handleDeleteClick:', error.message);
  }
}

/**
 * طلب تأكيد عملية الحذف مع تحذير الحذف المتتابع للمجلدات
 */
async function handleConfirmDelete(ctx, nodeId) {
  try {
    const userId = String(ctx.from.id);
    if (userId !== String(process.env.ADMIN_ID)) return;

    const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(Number(nodeId));
    if (!node) {
      return ctx.answerCbQuery('❌ عذراً، لم يتم العثور على هذا العنصر!');
    }

    await ctx.answerCbQuery();

    let nodeTypeName = 'ملف';
    let icon = '📄';
    let warningText = '';

    if (node.type === 'folder' || node.type === 'category') {
      nodeTypeName = 'مجلد';
      icon = '📁';
      warningText = `\n⚠️ <b>تنبيه هام جداً</b>: حذف المجلد سيؤدي لحذف كل المجلدات الفرعية والمحاضرات والملفات والكويزات المندرجة تحته بشكل نهائي ولا يمكن استعادتها!`;
    } else if (node.type === 'quiz') {
      nodeTypeName = 'كويز تفاعلي';
      icon = '📝';
    } else if (node.type === 'audio') {
      nodeTypeName = 'شرح صوتي';
      icon = '🎧';
    } else if (node.type === 'photo') {
      nodeTypeName = 'صورة توضيحية';
      icon = '🖼️';
    } else if (node.type === 'text') {
      nodeTypeName = 'رسالة نصية';
      icon = '✍️';
    }

    const inlineButtons = [
      [
        Markup.button.callback('🔴 نعم، احذف نهائياً', `perform_del_${node.id}`),
        Markup.button.callback('❌ إلغاء التراجع', 'cancel_del')
      ]
    ];

    // دالة هروب لرموز HTML لمنع أي توقف في الإرسال
    const escapeHtml = (text) => {
      if (!text) return '';
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    };

    await ctx.editMessageText(
      `🚨 <b>تأكيد حذف العنصر</b> 🚨\n` +
      `------------------------------------\n` +
      `هل أنت متأكد من رغبتك في حذف الـ ${nodeTypeName} التالي؟\n\n` +
      `${icon} الاسم: <b>${escapeHtml(node.name)}</b>\n` +
      `${warningText}\n` +
      `الرجاء التأكيد بالضغط على أحد الأزرار بالأسفل 👇`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(inlineButtons)
      }
    );

  } catch (error) {
    console.error('❌ Error in handleConfirmDelete:', error.message);
  }
}

/**
 * تنفيذ الحذف الفعلي من قاعدة البيانات والملفات الشجرية والـ JSON
 */
async function handlePerformDelete(ctx, nodeId) {
  try {
    const userId = String(ctx.from.id);
    if (userId !== String(process.env.ADMIN_ID)) return;

    const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(Number(nodeId));
    if (!node) {
      return ctx.answerCbQuery('❌ عذراً، هذا العنصر غير موجود بالفعل!');
    }

    await ctx.answerCbQuery('⏳ جاري الحذف...');

    // دالة حذف متتابعة متكاملة
    function deleteNodeRecursively(id) {
      const children = db.prepare('SELECT id FROM nodes WHERE parent_id = ?').all(id);
      for (const child of children) {
        deleteNodeRecursively(child.id);
      }
      
      const currentNode = db.prepare('SELECT type FROM nodes WHERE id = ?').get(id);
      if (currentNode && currentNode.type === 'quiz') {
        const { loadQuizzes, saveQuizzes } = require('../../utils/storage');
        const quizzes = loadQuizzes();
        delete quizzes[`node_${id}`];
        saveQuizzes(quizzes);
      }
      db.prepare('DELETE FROM nodes WHERE id = ?').run(id);
    }

    // تشغيل الحذف المتتابع نهائياً
    deleteNodeRecursively(node.id);

    await ctx.editMessageText(`✅ تم حذف العنصر **${node.name}** وكل محتوياته بنجاح!`);

    // إرسال كيبورد المجلد الحالي محدثاً أمام الأدمن
    const session = getSession(userId);
    const currentFolderId = session ? session.currentFolderId : 'root';
    return renderMenu(ctx, currentFolderId, true);

  } catch (error) {
    console.error('❌ Error in handlePerformDelete:', error.message);
  }
}

/**
 * إلغاء عملية الحذف وتنظيف الواجهة
 */
async function handleCancelDelete(ctx) {
  try {
    await ctx.answerCbQuery('❌ تم إلغاء العملية');
    await ctx.deleteMessage();
  } catch (error) {
    console.error('❌ Error in handleCancelDelete:', error.message);
  }
}

/**
 * معالجة الضغط على "⚙️ تعديل ونقل" للأدمن
 */
async function handleManageClick(ctx) {
  try {
    const userId = String(ctx.from.id);
    if (userId !== String(process.env.ADMIN_ID)) {
      return ctx.reply('❌ عذراً، هذه اللوحة مخصصة للأدمن فقط!');
    }

    const session = getSession(userId);
    const parentId = session ? session.currentFolderId : 'root';
    const dbParentId = parentId === 'root' ? null : Number(parentId);

    const nodes = db.prepare(`
      SELECT * FROM nodes
      WHERE parent_id IS ?
      ORDER BY id ASC
    `).all(dbParentId);

    if (nodes.length === 0) {
      return ctx.reply('⚠️ لا توجد أي عناصر داخل هذا المجلد لتعديلها حالياً!');
    }

    const inlineButtons = [];
    for (const node of nodes) {
      let icon = '📁';
      if (node.type === 'quiz') icon = '📝';
      else if (node.type === 'file') icon = '📄';
      else if (node.type === 'audio') icon = '🎧';
      else if (node.type === 'category') icon = '📁';
      else if (node.type === 'photo') icon = '🖼️';
      else if (node.type === 'text') icon = '✍️';

      inlineButtons.push([
        Markup.button.callback(`⚙️ ${icon} ${node.name.substring(0, 30)}`, `manage_select_${node.id}`)
      ]);
    }

    inlineButtons.push([
      Markup.button.callback('❌ إلغاء عملية التعديل', 'manage_cancel')
    ]);

    await ctx.reply(
      `⚙️ **لوحة التحكم وتعديل العناصر (LMS Manager)**\n` +
      `------------------------------------\n` +
      `📌 المجلد الحالي: \`${parentId === 'root' ? 'المستوى الرئيسي (Root)' : 'معرف #' + parentId}\`\n\n` +
      `الرجاء الضغط على العنصر الذي ترغب في تعديل اسمه أو نقله لمجلد آخر 👇`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(inlineButtons)
      }
    );

  } catch (error) {
    console.error('❌ Error in handleManageClick:', error.message);
  }
}

/**
 * عرض خيارات التحكم بالعنصر المحدد (إعادة تسمية / نقل)
 */
async function handleSelectManageNode(ctx, nodeId) {
  try {
    const userId = String(ctx.from.id);
    if (userId !== String(process.env.ADMIN_ID)) return;

    const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(Number(nodeId));
    if (!node) {
      return ctx.answerCbQuery('❌ عذراً، لم يتم العثور على هذا العنصر!');
    }

    await ctx.answerCbQuery();

    let icon = '📁';
    if (node.type === 'quiz') icon = '📝';
    else if (node.type === 'file') icon = '📄';
    else if (node.type === 'audio') icon = '🎧';
    else if (node.type === 'photo') icon = '🖼️';
    else if (node.type === 'text') icon = '✍️';

    const inlineButtons = [
      [
        Markup.button.callback('✍️ إعادة تسمية', `manage_rename_${node.id}`),
        Markup.button.callback('🔀 نقل لمجلد آخر', `manage_move_${node.id}`)
      ],
      [
        Markup.button.callback('❌ إلغاء العملية', 'manage_cancel')
      ]
    ];

    // دالة هروب لرموز HTML لمنع أي توقف في الإرسال
    const escapeHtml = (text) => {
      if (!text) return '';
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    };

    await ctx.editMessageText(
      `⚙️ <b>إدارة العنصر:</b> ${icon} <b>${escapeHtml(node.name)}</b>\n` +
      `------------------------------------\n` +
      `اختر الإجراء الذي ترغب في تطبيقه على هذا العنصر 👇`,
      {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard(inlineButtons)
      }
    );

  } catch (error) {
    console.error('❌ Error in handleSelectManageNode:', error.message);
  }
}

/**
 * طلب اسم جديد لإعادة تسمية العنصر
 */
async function handleRenameRequest(ctx, nodeId) {
  try {
    const userId = String(ctx.from.id);
    if (userId !== String(process.env.ADMIN_ID)) return;

    const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(Number(nodeId));
    if (!node) {
      return ctx.answerCbQuery('❌ عذراً، هذا العنصر غير موجود!');
    }

    await ctx.answerCbQuery();

    const session = getSession(userId) || {};
    
    // ضبط خطوة الجلسة وتخزين آيدي العنصر المراد تسميته
    setSession(userId, {
      currentFolderId: session.currentFolderId || 'root',
      step: 'waiting_rename_name',
      targetNodeId: node.id
    });

    await ctx.deleteMessage(); // مسح قائمة التحكم السابقة

    await ctx.reply(
      `✍️ **إعادة تسمية العنصر:**\n` +
      `------------------------------------\n` +
      `الاسم الحالي: \`${node.name}\`\n\n` +
      `✍️ أرسل الآن الاسم الجديد بالكامل في رسالة نصية ليتم تحديثه وحفظه فوراً!`,
      {
        parse_mode: 'Markdown',
        ...Markup.keyboard([['❌ إلغاء العملية']]).resize()
      }
    );

  } catch (error) {
    console.error('❌ Error in handleRenameRequest:', error.message);
  }
}

/**
 * عرض قائمة المجلدات المتاحة لنقل العنصر إليها
 */
async function handleMoveRequest(ctx, nodeId) {
  try {
    const userId = String(ctx.from.id);
    if (userId !== String(process.env.ADMIN_ID)) return;

    const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(Number(nodeId));
    if (!node) {
      return ctx.answerCbQuery('❌ عذراً، هذا العنصر غير موجود!');
    }

    await ctx.answerCbQuery();

    // جلب جميع المجلدات المتواجدة في قاعدة البيانات لنتمكن من النقل إليها
    // مع استبعاد المجلد نفسه وكافة مجلداته الفرعية (أبنائه وأحفاده) لتجنب التداخل الدائري اللانهائي!
    function getDescendantFolderIds(folderId) {
      const ids = [];
      const children = db.prepare("SELECT id FROM nodes WHERE parent_id = ? AND (type = 'folder' OR type = 'category')").all(folderId);
      for (const child of children) {
        ids.push(child.id);
        ids.push(...getDescendantFolderIds(child.id));
      }
      return ids;
    }

    const excludedIds = [node.id, ...getDescendantFolderIds(node.id)];

    const allFolders = db.prepare(`
      SELECT * FROM nodes
      WHERE type = 'folder' OR type = 'category'
      ORDER BY name ASC
    `).all();

    const folders = allFolders.filter(f => !excludedIds.includes(f.id));

    const inlineButtons = [];
    
    // خيار النقل للمستوى الرئيسي (Root)
    inlineButtons.push([
      Markup.button.callback('📁 [المستوى الرئيسي - Root]', `manage_perfmove_${node.id}_root`)
    ]);

    for (const folder of folders) {
      inlineButtons.push([
        Markup.button.callback(`📁 ${folder.name.substring(0, 30)}`, `manage_perfmove_${node.id}_${folder.id}`)
      ]);
    }

    inlineButtons.push([
      Markup.button.callback('❌ إلغاء النقل', 'manage_cancel')
    ]);

    await ctx.editMessageText(
      `🔀 **نقل العنصر:** [ \`${node.name}\` ]\n` +
      `------------------------------------\n` +
      `الرجاء تحديد المجلد المستهدف الذي ترغب في نقل هذا العنصر إليه بالأسفل 👇`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(inlineButtons)
      }
    );

  } catch (error) {
    console.error('❌ Error in handleMoveRequest:', error.message);
  }
}

/**
 * تنفيذ عملية النقل الفعلي في قاعدة البيانات
 */
async function handlePerformMove(ctx, nodeId, targetFolderId) {
  try {
    const userId = String(ctx.from.id);
    if (userId !== String(process.env.ADMIN_ID)) return;

    const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(Number(nodeId));
    if (!node) {
      return ctx.answerCbQuery('❌ عذراً، لم يتم العثور على العنصر!');
    }

    await ctx.answerCbQuery('⏳ جاري النقل...');

    const parentId = targetFolderId === 'root' ? null : Number(targetFolderId);

    // تحديث الأب في قاعدة البيانات بنجاح
    db.prepare('UPDATE nodes SET parent_id = ? WHERE id = ?').run(parentId, node.id);

    let targetName = 'المستوى الرئيسي (Root)';
    if (parentId !== null) {
      const targetFolder = db.prepare('SELECT name FROM nodes WHERE id = ?').get(parentId);
      if (targetFolder) targetName = targetFolder.name;
    }

    await ctx.editMessageText(`✅ تم نقل العنصر **${node.name}** بنجاح إلى المجلد:\n📁 **${targetName}**!`);

    const session = getSession(userId);
    const currentFolderId = session ? session.currentFolderId : 'root';
    return renderMenu(ctx, currentFolderId, true);

  } catch (error) {
    console.error('❌ Error in handlePerformMove:', error.message);
  }
}

module.exports = {
  handleAddClick,
  handleSelectType,
  handleCancelAdd,
  handleDeleteClick,
  handleConfirmDelete,
  handlePerformDelete,
  handleCancelDelete,
  handleManageClick,
  handleSelectManageNode,
  handleRenameRequest,
  handleMoveRequest,
  handlePerformMove
};
