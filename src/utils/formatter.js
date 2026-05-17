/**
 * محرك التطهير التلقائي للنصوص والـ Format Alignment 🧠🔥
 */
function cleanText(text) {
  return text
    // إزالة الـ BOM (Byte Order Mark) الخفي اللي بيبوظ قراءة أول السطور
    .replace(/\uFEFF/g, '')

    // توحيد الـ line endings لمسح ترميز الويندوز المزعج
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

    // توحيد صيغة answer : المكتوبة بسمول لتصبح Answer:
    .replace(/^answer\s*:/gim, 'Answer:')

    // توحيد صيغة correct : البديلة لتصبح Answer: وتتوافق مع الـ Parser
    .replace(/^correct\s*:/gim, 'Answer:')

    // إزالة المسافات الزائدة من أول وآخر الملف تماماً
    .trim();
}

module.exports = {
  cleanText
};