const { Telegraf, Markup } = require("telegraf");
const fs = require("fs");
const path = require("path");
const https = require("https");

const { handleUpload } = require("./handlers/upload");
const { handlePublish, preparePublishMenu, startMassPublishing } = require("./handlers/publish");

const bot = new Telegraf(process.env.BOT_TOKEN);
const adminId = process.env.ADMIN_ID;

const groupsFile = path.join(__dirname, "../../groups.json");
const pollsFile = path.join(__dirname, "../../polls.json");
const scoresFile = path.join(__dirname, "../../scores.json");

function loadData(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({}));
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch (e) { return {}; }
}

function saveData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// 📱 قائمة الأزرار الرئيسية التفاعلية لجهاز الممرض الأكاديمي
function getMainMenuKeyboard() {
  return Markup.keyboard([
    ["👤 ملفي الأكاديمي", "🏆 لوحة الشرف"],
    ["📜 شهاداتي ونتائجي", "🧠 شرح أخطائي"],
    ["ℹ️ مساعدة وتوجيه"]
  ]).resize();
}

// 🎖️ حساب الرتبة والمستوى بناءً على نقاط الخبرة التراكمية (Gamification)
function getRankDetails(xp) {
  if (xp <= 100) {
    return { level: 1, badge: "🩺", title: "طالب تمريض مستجد (Novice Student)", nextXP: 101 };
  } else if (xp <= 300) {
    return { level: 2, badge: "🩹", title: "ممرض ممارس متدرب (Practicing Intern)", nextXP: 301 };
  } else if (xp <= 600) {
    return { level: 3, badge: "💉", title: "أخصائي رعاية عامة (Staff Nurse)", nextXP: 601 };
  } else if (xp <= 1000) {
    return { level: 4, badge: "🫁", title: "أخصائي عناية مركزة وطوارئ (ICU Specialist)", nextXP: 1001 };
  } else {
    return { level: 5, badge: "🎓", title: "استشاري تمريض أكاديمي (Academic Consultant)", nextXP: null };
  }
}

// 📜 توليد كارت التفوق الأكاديمي والبرواز الطبي الأنيق بنظام الـ Unicode
function generateUnicodeCertificate(name, lecture, correct, total, rank) {
  const border = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";
  const cert = 
    `📜 *شهادة تفوق ورعاية تمريضية* 📜\n` +
    `\`${border}\`\n` +
    `🏆 يسر منصة التدريب الطبي أن تمنح:\n` +
    `👤 *${name}*\n` +
    `هذه الشهادة لتميزه الاستثنائي في حل كويز:\n` +
    `📚 *${lecture}*\n\n` +
    `🎯 الإجابات الصحيحة: *${correct}* من أصل *${total}*\n` +
    `🎖️ الرتبة الطبية الحالية: *${rank}*\n` +
    `\`${border}\`\n` +
    `✨ *تمنياتنا لك بمستقبل طبي مشرق لخدمة الإنسانية* 🩺💉`;
  return cert;
}

// 🤖 حارس لقط رسائل نص الـ Intro + حفظ المجموعات تلقائياً
bot.on("message", async (ctx, next) => {
  try {
    const chat = ctx.chat;
    const userId = String(ctx.from?.id);

    if (chat.type === "private" && global.waitingForSubject && global.waitingForSubject[userId] && ctx.message.text) {
      const subjectName = ctx.message.text.trim();
      startMassPublishing(ctx, userId, subjectName);
      return; 
    }

    if (chat && (chat.type === "group" || chat.type === "supergroup" || chat.type === "channel")) {
      let groups = loadData(groupsFile);
      if (!groups[String(chat.id)]) {
        groups[String(chat.id)] = { id: chat.id, title: chat.title, type: chat.type };
        saveData(groupsFile, groups);
      }
    }
  } catch (err) {}
  return next();
});

// معالجة تشغيل البوت وعرض تقرير النتيجة الأكاديمي بالحسابات الرياضية المظبوطة بالملي 🎯
bot.start(async (ctx) => {
  if (ctx.chat.type !== "private") return;
  const startPayload = ctx.payload;
  
  if (startPayload && startPayload.startsWith("result_")) {
    // 🎯 تطهير فوري لاسم المحاضرة القادم من الرابط وتحويل الشرطات لمسافات للمطابقة الصارمة
    const targetLecture = startPayload.replace("result_", "").replace(/_/g, " ").trim();
    
    const scores = loadData(scoresFile);
    const userId = String(ctx.from.id);
    const userKey = `${userId}_${targetLecture}`;
    const profileKey = `profile_${userId}`;

    if (!scores[userKey]) {
      return ctx.reply(`❌ عذراً! لم يتم العثور على أي إجابات مسجلة لك في محاضرة:\n📚 ${targetLecture}\n\nتأكد أنك قمت بحل الأسئلة بالكامل!`, { parse_mode: undefined });
    }

    const { correct, wrong, total } = scores[userKey];
    
    const totalAnswered = correct + wrong;
    const finalTotal = (total && total > 0) ? total : totalAnswered;
    const percentage = finalTotal > 0 ? Math.round((correct / finalTotal) * 100) : 0;

    let rating = "⚠️ تحتاج لمزيد من المذاكرة";
    if (percentage >= 90) rating = "ممتاز جداً (بروفيسور) ✨";
    else if (percentage >= 80) rating = "جيد جداً (رائع)";
    else if (percentage >= 70) rating = "جيد (مستوى مبشر)";
    else if (percentage >= 50) rating = "مقبول (شد حيلك)";

    const profile = scores[profileKey] || { xp: 0 };
    const xp = profile.xp || 0;
    const rankInfo = getRankDetails(xp);

    const resultText = 
      `📊 *تقرير نتيجتك الأكاديمية التمريضية:* \n\n` +
      `📚 *المحاضرة:* ${targetLecture}\n\n` +
      `✅ *الإجابات الصحيحة:* ${correct}\n` +
      `❌ *الإجابات الخاطئة:* ${wrong}\n` +
      `📝 *إجمالي الأسئلة المحلولة:* ${totalAnswered}/${finalTotal}\n\n` +
      `📊 *النسبة المئوية:* ${percentage}%\n` +
      `🎯 *التقييم العام:* ${rating}\n\n` +
      `🎖️ *رتبتك الطبية الحالية:* ${rankInfo.badge} ${rankInfo.title}\n` +
      `⚡ *نقاط الخبرة الكلية (XP):* ${xp} XP\n` +
      `${rankInfo.nextXP ? `⏳ النقاط المتبقية للرتبة التالية: ${rankInfo.nextXP - xp} XP\n` : "✨ لقد وصلت إلى أعلى رتبة طبية! استشاري قدير 🎓\n"}\n` +
      `شكراً لك ومزيد من التوفيق والنجاح! 🩺🎓`;

    // لو حصل على 90% أو أكثر، نولد له شهادة التميز الأنيقة
    if (percentage >= 90) {
      const name = profile.name || `${ctx.from.first_name || ""} ${ctx.from.last_name || ""}`.trim() || `User_${userId}`;
      const certificate = generateUnicodeCertificate(name, targetLecture, correct, finalTotal, `${rankInfo.badge} ${rankInfo.title}`);
      await ctx.reply(certificate, { parse_mode: "Markdown" });
    }

    // إرفاق زر الشرح الذكي بالذكاء الاصطناعي لو عنده أخطاء
    const buttons = [];
    if (wrong > 0) {
      buttons.push([Markup.button.callback("💡 اشرح لي الأخطاء بالذكاء الاصطناعي", `explain_${targetLecture.replace(/\s+/g, '_')}`)]);
    }
    
    return ctx.reply(resultText, { 
      parse_mode: "Markdown",
      ...(buttons.length > 0 ? Markup.inlineKeyboard(buttons) : {})
    });
  }
  return ctx.reply(
    `🚀 *أهلاً بك في نظام الكويزات التمريضية الأكاديمي!* 🩺✨\n\n` +
    `البوت مستعد الآن لرصد وحفظ نتائجك تلقائياً وبدقة بالغة.\n` +
    `استخدم القائمة أدناه للتنقل ومتابعة مستواك العلمي ورتبتك الطبية الحالية!`,
    { 
      parse_mode: "Markdown",
      ...getMainMenuKeyboard()
    }
  );
});

// 🎯 مراقبة إجابات الطلاب وحظر التغيير والتكرار التكتيكي (Anti-Cheat Engine)
bot.on("poll_answer", async (ctx) => {
  try {
    console.log("🔥 POLL ANSWER RECEIVED LAUNCHED!");
    const answer = ctx.pollAnswer;
    const pollId = String(answer.poll_id);
    const userId = String(answer.user.id);
    
    // لقط اسم الطالب بالكامل لتوثيقه في كارت التميز والـ Profile
    const firstName = answer.user.first_name || "";
    const lastName = answer.user.last_name || "";
    const username = answer.user.username ? `@${answer.user.username}` : "";
    const fullName = `${firstName} ${lastName}`.trim() || username || `User_${userId}`;
    
    const polls = loadData(pollsFile);
    const pollData = polls[pollId];
    if (!pollData) return;

    // لقط اسم المحاضرة وتطهيره من أي مسافات زائدة لتوحيد الـ Key دايماً
    const lectureClean = String(pollData.lecture).replace(/_/g, " ").trim();
    const { correct, total } = pollData;
    
    const userKey = `${userId}_${lectureClean}`;
    const profileKey = `profile_${userId}`;
    let scores = loadData(scoresFile);
    
    if (!scores[userKey]) {
      scores[userKey] = { 
        correct: 0, 
        wrong: 0, 
        total: Number(total || 0), 
        answeredPolls: {},
        answersLog: {}
      };
    }

    // حارس منع تكرار أو تعديل الإجابة
    if (scores[userKey].answeredPolls && scores[userKey].answeredPolls[pollId]) {
      console.log(`⚠️ Blocked duplicate vote attempt from Student: ${fullName} (${userId}) on Poll: ${pollId}`);
      return;
    }

    if (!scores[userKey].answeredPolls) scores[userKey].answeredPolls = {};
    scores[userKey].answeredPolls[pollId] = true;

    // تهيئة أو تحديث الملف التعريفي للـ Gamification والـ Reminders
    if (!scores[profileKey]) {
      scores[profileKey] = {
        userId: userId,
        name: fullName,
        xp: 0,
        rank: "🩺 طالب تمريض مستجد (Novice Student)",
        lastActive: new Date().toISOString()
      };
    } else {
      scores[profileKey].name = fullName;
      scores[profileKey].lastActive = new Date().toISOString();
    }

    const studentChoice = answer.option_ids[0];
    const isCorrect = (studentChoice === correct);

    // تسجيل خيار الطالب وتوثيق الخطأ لأغراض التفسير السريري بالذكاء الاصطناعي
    if (!scores[userKey].answersLog) scores[userKey].answersLog = {};
    scores[userKey].answersLog[pollId] = {
      chosen: studentChoice,
      correct: correct,
      isCorrect: isCorrect
    };

    if (isCorrect) {
      scores[userKey].correct += 1;
      scores[profileKey].xp += 10; // زيادة 10 نقاط خبرة لكل إجابة صحيحة
    } else {
      scores[userKey].wrong += 1;
    }

    // تحديث الرتبة الطبية ديناميكياً وحفظها
    const rankInfo = getRankDetails(scores[profileKey].xp);
    scores[profileKey].rank = `${rankInfo.badge} ${rankInfo.title}`;

    saveData(scoresFile, scores);
    console.log(`📝 [Score & XP Saved] -> Student: ${fullName} (${userId}) | Lecture: ${lectureClean} | XP: ${scores[profileKey].xp} | Rank: ${scores[profileKey].rank} | Correct: ${scores[userKey].correct} | Wrong: ${scores[userKey].wrong}`);
  } catch (err) {
    console.log("❌ Poll Answer Error Caught:", err.message);
  }
});

bot.on("document", async (ctx) => {
  if (ctx.chat.type !== "private" || String(ctx.from.id) !== String(adminId)) return;
  return handleUpload(ctx);
});

bot.command("publish", async (ctx) => {
  if (ctx.chat.type !== "private" || String(ctx.from.id) !== String(adminId)) return;
  return handlePublish(ctx);
});

bot.action(/^publish_(.+)/, async (ctx) => {
  try {
    const groupId = ctx.match[1];
    await ctx.answerCbQuery();
    return preparePublishMenu(ctx, groupId); 
  } catch (err) {}
});

// 🧠 استدعاء خادم Gemini AI بأسلوب أصيل وخفيف دون أي مكتبات خارجية ثقيلة مع نظام تنقل احتياطي للموديلات
function callGeminiAPI(apiKey, prompt) {
  const models = [
    "gemini-2.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.5-flash",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash"
  ];

  const makeRequest = (modelName) => {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ]
      });

      const options = {
        hostname: 'generativelanguage.googleapis.com',
        port: 443,
        path: `/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (parsed && parsed.candidates && parsed.candidates[0] && parsed.candidates[0].content && parsed.candidates[0].content.parts[0]) {
              resolve(parsed.candidates[0].content.parts[0].text);
            } else {
              reject(new Error(body));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', (e) => reject(e));
      req.write(data);
      req.end();
    });
  };

  return new Promise(async (resolve, reject) => {
    let lastError = null;
    for (const model of models) {
      try {
        console.log(`🧠 Attempting Gemini call with model: ${model}...`);
        const result = await makeRequest(model);
        console.log(`🎉 Gemini success with model: ${model}`);
        return resolve(result);
      } catch (err) {
        lastError = err;
        console.log(`❌ Model ${model} failed:`, err.message.substring(0, 150));
      }
    }
    reject(lastError || new Error("Failed to contact any Gemini models"));
  });
}

// 💡 معالج استدعاء الذكاء الاصطناعي لشرح الأسئلة الخاطئة للطلاب بالتفصيل السريري
bot.action(/^explain_(.+)/, async (ctx) => {
  try {
    const lectureClean = ctx.match[1].replace(/_/g, " ").trim();
    const userId = String(ctx.from.id);
    const userKey = `${userId}_${lectureClean}`;
    
    const scores = loadData(scoresFile);
    if (!scores[userKey] || !scores[userKey].answersLog) {
      return ctx.answerCbQuery("❌ لم يتم العثور على سجل إجابات لهذه المحاضرة لشرحها.", { show_alert: true });
    }
    
    await ctx.answerCbQuery("⏳ جاري تحليل إجاباتك وتحضير الشرح السريري...");
    await ctx.reply("🧠 جاري دراسة الحالات السريرية والأسئلة الخاطئة وتوليد الشرح العلمي بالذكاء الاصطناعي... انتظر قليلاً 🩺");

    const answersLog = scores[userKey].answersLog;
    const incorrectPolls = Object.keys(answersLog).filter(pollId => !answersLog[pollId].isCorrect);
    
    if (incorrectPolls.length === 0) {
      return ctx.reply("✨ هنيئاً لك! لم تقم بارتكاب أي أخطاء في هذه المحاضرة، لا داعي للشرح!");
    }
    
    const polls = loadData(pollsFile);
    const questionsToExplain = [];
    
    for (const pollId of incorrectPolls) {
      const pollData = polls[pollId];
      if (pollData && pollData.questionText) {
        const studentChoiceIndex = answersLog[pollId].chosen;
        const correctChoiceIndex = pollData.correct;
        const studentChoiceText = pollData.options[studentChoiceIndex] || "غير محدد";
        const correctChoiceText = pollData.options[correctChoiceIndex] || "غير محدد";
        
        questionsToExplain.push({
          question: pollData.questionText,
          options: pollData.options,
          studentChoice: studentChoiceText,
          correctChoice: correctChoiceText
        });
      }
    }
    
    if (questionsToExplain.length === 0) {
      return ctx.reply("⚠️ لم نتمكن من العثور على نصوص الأسئلة الخاطئة في قاعدة البيانات (ربما تم نشر الكويز قبل التحديث). يرجى حل كويز جديد لتفعيل هذه الميزة!");
    }
    
    let prompt = `أنت بروفيسور تمريض أكاديمي وخبير في التعليم الطبي ورعاية المرضى وسرعة البديهة الطبية.
قام أحد طلاب التمريض بحل كويز حول موضوع "${lectureClean}" وارتكب بعض الأخطاء.
مهمتك هي مراجعة كل سؤال أخطأ فيه الطالب، وتوضيح الخيار الصحيح علمياً، وتقديم تفسير وشرح طبي وسريري (Clinical Rationale) مفصل باللغة العربية الفصحى وبأسلوب أكاديمي مشجع لمساعدته على الفهم والتعلم المتميز.

الأسئلة التي أخطأ فيها الطالب هي:
`;

    questionsToExplain.forEach((q, idx) => {
      prompt += `\nالسؤال ${idx + 1}: ${q.question}
الخيارات المتاحة:
${q.options.map((opt, i) => `${i + 1}. ${opt}`).join("\n")}
إجابة الطالب الخاطئة: "${q.studentChoice}"
الإجابة الصحيحة علمياً: "${q.correctChoice}"
---
`;
    });

    prompt += `\nيرجى تنسيق الشرح بشكل منظم وجميل جداً باستخدام Markdown، مع وضع إيموجيات طبية تشجيعية، وتوضيح القاعدة التمريضية الذهبية (Golden Nursing Rule) لكل سؤال.`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback response with simulated high-quality nursing advice
      let fallbackText = `💡 *شرح الأخطاء العلمي التمريضي (شرح تلقائي مبسط):* \n\n`;
      questionsToExplain.forEach((q, idx) => {
        fallbackText += 
          `❓ *السؤال ${idx + 1}:* ${q.question}\n` +
          `❌ *إجابتك:* ${q.studentChoice}\n` +
          `✅ *الإجابة الصحيحة:* ${q.correctChoice}\n` +
          `🧠 *التفسير العلمي السريري:* في الممارسة التمريضية، يجب دائماً إعطاء الأولوية القصوى لسلامة المريض والتدخل الفوري القائم على الأدلة السريرية. الإجابة المحددة باللون الأخضر هي الخيار المثالي لأنها تتماشى مع المبادئ التمريضية القائمة على حماية الجهاز التنفسي والدورة الدموية (ABCs).\n\n` +
          `----------------------------------------\n\n`;
      });
      fallbackText += `📢 _ملاحظة: لتمكين شروح الذكاء الاصطناعي الديناميكية الكاملة من Gemini AI، يرجى إضافة مفتاح الـ API باسم GEMINI_API_KEY في ملف الإعدادات الخاص بالبوت!_ 🩺✨`;
      
      return ctx.reply(fallbackText, { parse_mode: "Markdown" });
    }

    try {
      const aiExplanation = await callGeminiAPI(apiKey, prompt);
      
      const sendReply = async (text) => {
        try {
          if (text.length > 4000) {
            for (let i = 0; i < text.length; i += 4000) {
              await ctx.reply(text.substring(i, i + 4000), { parse_mode: "Markdown" });
            }
          } else {
            await ctx.reply(text, { parse_mode: "Markdown" });
          }
        } catch (markdownErr) {
          console.log("⚠️ Markdown parse failed, retrying without parsing:", markdownErr.message);
          if (text.length > 4000) {
            for (let i = 0; i < text.length; i += 4000) {
              await ctx.reply(text.substring(i, i + 4000));
            }
          } else {
            await ctx.reply(text);
          }
        }
      };

      await sendReply(aiExplanation);
    } catch (apiErr) {
      console.log("❌ Gemini API HTTPS Error:", apiErr.message);
      return ctx.reply("❌ عذراً، حدث خطأ أثناء الاتصال بخادم الذكاء الاصطناعي Gemini. يرجى المحاولة لاحقاً!");
    }
  } catch (err) {
    console.log("❌ AI Explanation Handler Error:", err.message);
  }
});

// 📱 أمر القائمة يدوياً لفتح أزرار التفاعل بأي وقت
bot.command("menu", async (ctx) => {
  if (ctx.chat.type !== "private") return;
  return ctx.reply("📱 *القائمة الرئيسية التفاعلية لجهازك التمريضي:*", {
    parse_mode: "Markdown",
    ...getMainMenuKeyboard()
  });
});

// 👤 معالج الضغط على "👤 ملفي الأكاديمي"
bot.hears("👤 ملفي الأكاديمي", async (ctx) => {
  if (ctx.chat.type !== "private") return;
  const userId = String(ctx.from.id);
  const scores = loadData(scoresFile);
  const profileKey = `profile_${userId}`;
  const profile = scores[profileKey];

  if (!profile) {
    return ctx.reply(
      `🩺 *ملفك التعريفي التمريضي:*\n\n` +
      `👤 الاسم: *${ctx.from.first_name || "طالب مستجد"}*\n` +
      `⚡ نقاط الخبرة (XP): *0 XP*\n` +
      `🎖️ الرتبة الحالية: *🩺 طالب تمريض مستجد (Novice Student)*\n\n` +
      `💡 _ابدأ بحل الكويزات في المجموعات الطبية لكسب أولى نقاط خبرتك والترقية السريعة!_`,
      { parse_mode: "Markdown" }
    );
  }

  const xp = profile.xp || 0;
  const rankInfo = getRankDetails(xp);
  
  let totalCorrect = 0;
  let totalWrong = 0;
  let quizzesCount = 0;
  Object.keys(scores).forEach(key => {
    if (key.startsWith(`${userId}_`) && !key.startsWith("profile_")) {
      totalCorrect += scores[key].correct || 0;
      totalWrong += scores[key].wrong || 0;
      quizzesCount++;
    }
  });

  const profileText = 
    `🩺 *الملف الأكاديمي للممرض المتميز:* \n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *الاسم:* ${profile.name}\n` +
    `⚡ *نقاط الخبرة (XP):* ${xp} XP\n` +
    `🎖️ *الرتبة الطبية:* ${rankInfo.badge} ${rankInfo.title}\n` +
    `${rankInfo.nextXP ? `⏳ *المتبقي للترقية التالية:* ${rankInfo.nextXP - xp} XP\n` : "✨ *لقد وصلت إلى أعلى رتبة طبية تمريضية!* 🎓\n"}\n` +
    `📊 *الإحصائيات السريرية الشاملة:*\n` +
    `📚 *عدد المحاضرات التي تم حلها:* ${quizzesCount}\n` +
    `✅ *مجموع الإجابات الصحيحة:* ${totalCorrect}\n` +
    `❌ *مجموع الإجابات الخاطئة:* ${totalWrong}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🏥 *دمتم عوناً وسنداً للمرضى ورعاة للإنسانية!* ✨`;

  return ctx.reply(profileText, { parse_mode: "Markdown" });
});

// 🏆 معالج الضغط على "🏆 لوحة الشرف"
bot.hears("🏆 لوحة الشرف", async (ctx) => {
  if (ctx.chat.type !== "private") return;
  const scores = loadData(scoresFile);
  
  const profiles = [];
  Object.keys(scores).forEach(key => {
    if (key.startsWith("profile_")) {
      profiles.push(scores[key]);
    }
  });

  if (profiles.length === 0) {
    return ctx.reply("🏆 *لوحة الشرف الطبية فارغة حالياً. كن أول من يتصدرها بحل الكويزات!*");
  }

  profiles.sort((a, b) => (b.xp || 0) - (a.xp || 0));

  let leaderboardText = `🏆 *لوحة الشرف الأكاديمية لطلاب التمريض:* \n`;
  leaderboardText += `🥇 متصدري الرعاية الصحية والتميز السريري 🥇\n`;
  leaderboardText += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  const top10 = profiles.slice(0, 10);
  top10.forEach((p, idx) => {
    let medal = "🔹";
    if (idx === 0) medal = "🥇";
    else if (idx === 1) medal = "🥈";
    else if (idx === 2) medal = "🥉";

    const rankInfo = getRankDetails(p.xp || 0);
    leaderboardText += `${medal} *الترتيب ${idx + 1}:* ${p.name}\n` +
                        `    ⚡ *النقاط:* ${p.xp || 0} XP | الرتبة: ${rankInfo.badge}\n\n`;
  });

  leaderboardText += `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                     `💡 _اجتهد في الكويزات القادمة لتسجيل اسمك في لوحة المتفوقين!_ 🩺✨`;

  return ctx.reply(leaderboardText, { parse_mode: "Markdown" });
});

// 📜 معالج الضغط على "📜 شهاداتي ونتائجي"
bot.hears("📜 شهاداتي ونتائجي", async (ctx) => {
  if (ctx.chat.type !== "private") return;
  const userId = String(ctx.from.id);
  const scores = loadData(scoresFile);

  const results = [];
  Object.keys(scores).forEach(key => {
    if (key.startsWith(`${userId}_`) && !key.startsWith("profile_")) {
      const lectureClean = key.replace(`${userId}_`, "");
      results.push({
        lecture: lectureClean,
        ...scores[key]
      });
    }
  });

  if (results.length === 0) {
    return ctx.reply("❌ *لم تقم بحل أي كويزات بعد. شارك في الكويزات بالجروب لتظهر نتائجك هنا!* 📚");
  }

  let text = `📜 *سجل نتائجك وشهاداتك التمريضية:* \n`;
  text += `━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

  const inlineButtons = [];

  results.forEach(res => {
    const totalAnswered = res.correct + res.wrong;
    const finalTotal = (res.total && res.total > 0) ? res.total : totalAnswered;
    const percentage = finalTotal > 0 ? Math.round((res.correct / finalTotal) * 100) : 0;

    text += `📚 *المحاضرة:* ${res.lecture}\n` +
            `📊 *النتيجة:* ${res.correct}/${finalTotal} (${percentage}%)\n`;
    
    if (percentage >= 90) {
      text += `🏆 *الحالة:* حصلت على الشهادة بنجاح 📜🎖️\n\n`;
      inlineButtons.push([
        Markup.button.callback(`📜 شهادة: ${res.lecture.substring(0, 20)}...`, `cert_${res.lecture.replace(/\s+/g, '_')}`)
      ]);
    } else {
      text += `💡 *الحالة:* تحتاج 90% للحصول على شهادة التميز\n\n`;
    }
  });

  text += `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `💡 _اضغط على أي زر أدناه لإعادة عرض شهادتك الفاخرة بالكامل!_`;

  if (inlineButtons.length > 0) {
    return ctx.reply(text, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard(inlineButtons)
    });
  } else {
    return ctx.reply(text, { parse_mode: "Markdown" });
  }
});

// 📜 معالج استرداد الشهادة الفردية عبر الأزرار التفاعلية
bot.action(/^cert_(.+)/, async (ctx) => {
  try {
    const lectureClean = ctx.match[1].replace(/_/g, " ").trim();
    const userId = String(ctx.from.id);
    const scores = loadData(scoresFile);
    const userKey = `${userId}_${lectureClean}`;
    const profileKey = `profile_${userId}`;

    if (!scores[userKey]) {
      return ctx.answerCbQuery("❌ لم يتم العثور على النتيجة.");
    }

    const { correct, wrong, total } = scores[userKey];
    const totalAnswered = correct + wrong;
    const finalTotal = (total && total > 0) ? total : totalAnswered;
    const profile = scores[profileKey] || { xp: 0 };
    const rankInfo = getRankDetails(profile.xp || 0);

    const name = profile.name || `${ctx.from.first_name || ""} ${ctx.from.last_name || ""}`.trim() || `User_${userId}`;
    const certificate = generateUnicodeCertificate(name, lectureClean, correct, finalTotal, `${rankInfo.badge} ${rankInfo.title}`);

    await ctx.answerCbQuery();
    await ctx.reply(certificate, { parse_mode: "Markdown" });
  } catch (err) {
    console.log("❌ Cert Callback Error:", err.message);
  }
});

// 🧠 معالج الضغط على "🧠 شرح أخطائي"
bot.hears("🧠 شرح أخطائي", async (ctx) => {
  if (ctx.chat.type !== "private") return;
  const userId = String(ctx.from.id);
  const scores = loadData(scoresFile);

  const errorLectures = [];
  Object.keys(scores).forEach(key => {
    if (key.startsWith(`${userId}_`) && !key.startsWith("profile_")) {
      const data = scores[key];
      if (data.wrong > 0) {
        const lectureClean = key.replace(`${userId}_`, "");
        errorLectures.push(lectureClean);
      }
    }
  });

  if (errorLectures.length === 0) {
    return ctx.reply("🎉 *أنت ممرض ممتاز! ليس لديك أي أخطاء مسجلة تحتاج لشرح بالذكاء الاصطناعي حالياً.* 🩺✨");
  }

  let text = `🧠 *رفيقك الطبي بالذكاء الاصطناعي لتوضيح الأخطاء:* \n\n` +
             `اختر المحاضرة التي ترغب في مراجعة أخطائها وتلقي شرح سريري مفصل لها من Gemini AI:`;

  const inlineButtons = errorLectures.map(lecture => {
    return [Markup.button.callback(`🧠 شرح: ${lecture.substring(0, 20)}...`, `explain_${lecture.replace(/\s+/g, '_')}`)];
  });

  return ctx.reply(text, {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard(inlineButtons)
  });
});

// ℹ️ معالج الضغط على "ℹ️ مساعدة وتوجيه"
bot.hears("ℹ️ مساعدة وتوجيه", async (ctx) => {
  if (ctx.chat.type !== "private") return;
  
  const helpText = 
    `ℹ️ *دليل التوجيه السريع لطلبة التمريض ورعاة الصحة:* \n\n` +
    `📚 *كيفية عمل البوت والاستفادة منه:*\n` +
    `1️⃣ *حل الكويزات:* قم بالإجابة على أسئلة الكويزات التي ينشرها الأدمن في الجروب.\n` +
    `2️⃣ *كسب نقاط الخبرة (XP):* كل إجابة صحيحة تمنحك *+10 XP* لرفع رتبتك الطبية.\n` +
    `3️⃣ *الشهادات:* تحقيق درجة *≥ 90%* يمنحك شهادة تفوق Unicode معتمدة بالبوت.\n` +
    `4️⃣ *الشرح بالذكاء الاصطناعي:* إذا أخطأت في أي سؤال، يمكنك مراجعته والحصول على الشرح السريري الذهبي فوراً بضغطة زر واحدة!\n\n` +
    `🎖️ *نظام الترقيات والرتب الطبية:*\n` +
    `🩺 *0 - 100 XP:* طالب تمريض مستجد (Novice Student)\n` +
    `🩹 *101 - 300 XP:* ممرض ممارس متدرب (Practicing Intern)\n` +
    `💉 *301 - 600 XP:* أخصائي رعاية عامة (Staff Nurse)\n` +
    `🫁 *601 - 1000 XP:* أخصائي عناية مركزة وطوارئ (ICU Specialist)\n` +
    `🎓 *1001+ XP:* استشاري تمريض أكاديمي (Academic Consultant)\n\n` +
    `🏥 *نتمنى لكم مسيرة علمية سريرية مليئة بالتميز!* ✨`;

  return ctx.reply(helpText, { parse_mode: "Markdown" });
});

module.exports = bot;