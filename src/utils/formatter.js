/**
 * محرك التطهير التلقائي للنصوص والـ Format Alignment 🧠🔥
 */
function cleanText(text) {
  return text
    // إزالة الـ BOM الخفي اللي بيبوظ قراءة أول السطور
    .replace(/\uFEFF/g, '')

    // توحيد الـ line endings لمسح ترميز الويندوز المزعج \r
    .replace(/\r/g, '\n')

    // إزالة مسافات الـ Tab والفراغات الأفقية المكررة وسط السطور
    .replace(/[ \t]+/g, ' ')

    // إزالة الأسطر الفاضية الكثيرة والمتتالية لتكثيف النص
    .replace(/\n{3,}/g, '\n\n')

    // توحيد وإزالة الرموز النقطية الزائدة لو وجدت في أول السطور
    .replace(/^[•\-]\s*/gm, '')

    // تحويل صيغة (A.) إلى الصيغة الأكاديمية المعتمدة للبوت (A) )
    .replace(/^([A-F])\.\s*/gim, '$1) ')

    // تحويل صيغة (A-) إلى الصيغة الأكاديمية المعتمدة للبوت (A) )
    .replace(/^([A-F])-\s*/gim, '$1) ')

    // إزالة نجوم التلوين والزيادات حول الكلمات المفتاحية في بداية السطر
    .replace(/^\s*\*?\*?\s*(Answer|correct|explanation|توضيح)\s*\*?\*?\s*:\s*\*?\*?\s*/gim, '$1: ')

    // توحيد صيغة answer : المكتوبة بسمول لتصبح Answer:
    .replace(/^answer\s*:/gim, 'Answer:')

    // توحيد صيغة correct : البديلة لتصبح Answer: وتتوافق مع الـ Parser
    .replace(/^correct\s*:/gim, 'Answer:')

    // توحيد صيغة explanation : وتوضيح : لتصبح Explanation: وتتوافق مع الـ Parser
    .replace(/^(explanation|توضيح)\s*:/gim, 'Explanation:')

    // إزالة النجوم الختامية من أسطر الإجابة والتوضيح إن وجدت
    .replace(/^(Answer\s*:\s*.*?)\s*\*?\*?$/gim, '$1')
    .replace(/^(Explanation\s*:\s*.*?)\s*\*?\*?$/gim, '$1')

    // إزالة المسافات الزائدة من أول وآخر الملف تماماً
    .trim();
}

/**
 * دالة القص الذكي للنصوص دون قطع الكلمات مع إضافة ثلاث نقاط عند الاقتضاء
 */
function truncateText(text, limit) {
  if (!text || text.length <= limit) return text;
  
  // نترك مساحة 3 حروف للثلاث نقاط
  const maxLen = limit - 3;
  
  // البحث عن آخر مسافة قبل الحد الأقصى لتفادي قطع الكلمات
  const lastSpace = text.lastIndexOf(' ', maxLen);
  if (lastSpace > 0) {
    return text.substring(0, lastSpace) + '...';
  }
  
  // كحالة احتياطية لو النص عبارة عن كلمة واحدة طويلة جداً
  return text.substring(0, maxLen) + '...';
}

module.exports = {
  cleanText,
  truncateText
};