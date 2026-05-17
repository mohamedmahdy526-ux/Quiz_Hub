function adminOnly(ctx, next) {
  // جلب آيدي الأدمن من متغيرات البيئة
  const adminId = process.env.ADMIN_ID;

  // التأكد من وجود مستخدم أرسل الرسالة لتجنب الـ Crashes في بعض الـ Updates
  if (!ctx.from) return;

  // تحويل الآيديهات لـ String لضمان مقارنة دقيقة بدون مشاكل الـ Types
  const userId = String(ctx.from.id);

  // 🛡️ لو مش الأدمن.. اقفل الباب في وشه واقطع الـ Pipeline
  if (userId !== String(adminId)) {
    return ctx.reply('❌ عذراً، هذا الأمر مخصص لإدارة المنصة فقط وغير مصرح لك باستخدامه!');
  }

  // 🔑 لو الأدمن.. مرره للمرحلة الجاية في الـ Pipeline (الـ Handler الفعلي)
  return next();
}

module.exports = {
  adminOnly
};