import db from "../../models/index.js";
import path from "path";
import fs from "fs";
import { speechToTextService } from "../ai/sttService.js";
import { analyzeEmotionService } from "../ai/emotionService.js";
import {
  diarizationService,
  predictToneService,
} from "../ai/diarizationService.js";
import {
  mapTextToSegments,
  removeDuplicateSegments,
} from "../ai/speakerMappingService.js";
import { mergeSpeakerSegments } from "../ai/segmentService.js";
import {
  calculateFinalScore,
  classifySentimentLevel,
  calculateVoiceScore,
  detectHardRoleV2,
  mapToneEmotionToScore,
  normalizeToneEmotion,
  resolveRolePair,
  normalizeToneProbs,
} from "../domain/scoringService.js";
import { recalcUserMonthlyStats } from "../dashboardService.js";
import { cutAudioSegment, ensureTempDir } from "../../utils/audioCutService.js";

const normalizeText = (text) => {
  if (!text) return "";

  return text
    .replace(/\s+/g, " ")
    .replace(/([,.!?])\1+/g, "$1")
    .replace(/\s([,.!?])/g, "$1")
    .trim();
};

const normalizeSpeakerKey = (key = "") => {
  const k = String(key).toUpperCase().trim();

  if (k === "SPEAKER_00" || k === "SPEAKER_0") return "SPEAKER_00";
  if (k === "SPEAKER_01" || k === "SPEAKER_1") return "SPEAKER_01";

  const match = k.match(/SPEAKER[_\s-]?0*(\d+)/);

  if (match) {
    const num = Number(match[1]);
    if (num === 0) return "SPEAKER_00";
    if (num === 1) return "SPEAKER_01";
  }

  return k;
};

const updateFinalAnalysisScore = async (conversationId) => {
  try {
    console.log("\n🧠 UPDATE FINAL ANALYSIS");
    console.log("===================================");

    // 1. lấy speaker text (SOURCE OF TRUTH cho role)
    const speakers = await db.SpeakerAnalysisResult.findAll({
      where: { conversationId },
    });

    if (!speakers.length) {
      console.warn("⚠ No speaker analysis");
      return;
    }

    // 2. lấy tone
    const tones = await db.VoiceToneResult.findAll({
      where: { conversationId },
    });

    // 3. build map từ speakerAnalysis (giữ role ở đây)
    const map = {};

    speakers.forEach((sp) => {
      map[sp.speakerLabel] = {
        role: sp.role,
        textScore: Number(sp.score ?? 0.5),
        textConfidence: Number(sp.confidence ?? 0.5),
        textEmotion: sp.emotion || "neutral",
        toneScore: 0.5,
        toneConfidence: 0.5,
        toneEmotion: "neutral",
      };
    });

    // 4. merge tone vào (KHÔNG overwrite role)
    tones.forEach((t) => {
      if (!map[t.speakerLabel]) return;

      map[t.speakerLabel].toneScore = t.toneScore;
      map[t.speakerLabel].toneConfidence = Number(t.toneConfidence ?? 0.5);
      map[t.speakerLabel].toneEmotion = t.toneEmotion || "neutral";
    });

    // 5. tính score từng role
    let customerFinal = 0;
    let staffFinal = 0;
    let customerConfidence = 0;
    let staffConfidence = 0;
    let customerEmotion = null;
    let staffEmotion = null;

    Object.entries(map).forEach(([label, sp]) => {
      const text = sp.textScore ?? 0.5;
      const tone = sp.toneScore ?? 0.5;
      const textConfidence = sp.textConfidence ?? 0.5;
      const toneConfidence = sp.toneConfidence ?? 0.5;

      const final = text * 0.7 + tone * 0.3;
      const finalConfidence = textConfidence * 0.7 + toneConfidence * 0.3;

      console.log(
        `→ ${label} (${sp.role}) | text=${text.toFixed(2)} tone=${tone.toFixed(
          2,
        )} → final=${final.toFixed(2)} | confidence=${finalConfidence.toFixed(2)}`,
      );

      if (sp.role === "customer") {
        customerFinal = final;
        customerConfidence = finalConfidence;
        customerEmotion = sp.textEmotion || "neutral";
      }

      if (sp.role === "staff") {
        staffFinal = final;
        staffConfidence = finalConfidence;
        staffEmotion = sp.textEmotion || "neutral";
      }
    });

    // 🔥 fallback nếu thiếu 1 role
    if (!customerFinal && staffFinal) {
      customerFinal = staffFinal;
      customerConfidence = staffConfidence;
    }

    if (!staffFinal && customerFinal) {
      staffFinal = customerFinal;
      staffConfidence = customerConfidence;
    }

    // 6. final toàn conversation
    const finalScore = customerFinal * 0.7 + staffFinal * 0.3;
    const finalConfidence = customerConfidence * 0.7 + staffConfidence * 0.3;
    const finalSentiment = classifySentimentLevel(finalScore);
    const finalEmotion = customerEmotion || staffEmotion || "neutral";

    console.log("👉 customerFinal:", customerFinal.toFixed(2));
    console.log("👉 staffFinal:", staffFinal.toFixed(2));
    console.log("🔥 FINAL SCORE:", finalScore.toFixed(2));
    console.log("👉 finalConfidence:", finalConfidence.toFixed(2));
    console.log("👉 finalEmotion:", finalEmotion);

    // 7. UPDATE analysis (không create mới)
    await db.AnalysisResult.update(
      {
        score: finalScore,
        sentiment: finalSentiment,
        emotion: finalEmotion,
        confidence: finalConfidence,
        customerScore: customerFinal,
        staffScore: staffFinal,
      },
      {
        where: { conversationId },
      },
    );

    console.log("===================================\n");
  } catch (err) {
    console.error("❌ Update Final Score Error:", err);
  }
};

const handleUploadAudioService = async (conversationId, userId, audioPath) => {
  try {
    console.log("=======================================");
    console.time("⏱ TOTAL UPLOAD PIPELINE");

    /* =========================
       1. CHECK DATA
    ========================= */
    const [user, conversation] = await Promise.all([
      db.User.findByPk(userId),
      db.Conversation.findByPk(conversationId),
    ]);

    if (!user) throw new Error("User not found");
    if (!conversation) throw new Error("Conversation not found");

    /* =========================
       2. PARALLEL STT + DIARIZATION
    ========================= */
    console.time("⏱ STT + DIARIZATION");

    const sttStart = Date.now();
    const sttPromise = speechToTextService(audioPath);

    const diaStart = Date.now();
    const diaPromise = diarizationService(audioPath);

    const [stt, rawSegments] = await Promise.all([sttPromise, diaPromise]);

    console.log("🔥 RAW SEGMENTS LENGTH:", rawSegments?.length);
    console.log("🔥 RAW SEGMENTS SAMPLE:", rawSegments?.slice?.(0, 5));

    console.log("🔥 STT SEGMENTS LENGTH:", stt?.segments?.length);
    console.log("🔥 STT SEGMENTS SAMPLE:", stt?.segments?.slice?.(0, 3));

    console.timeEnd("⏱ STT + DIARIZATION");

    console.log(
      "⏱ STT TIME:",
      ((Date.now() - sttStart) / 1000).toFixed(2),
      "s",
    );

    console.log(
      "⏱ DIARIZATION TIME:",
      ((Date.now() - diaStart) / 1000).toFixed(2),
      "s",
    );

    if (stt.errCode !== 0) {
      throw new Error("STT failed");
    }

    /* =========================
       3. BUILD SPEAKER SEGMENTS
    ========================= */
    let speakerSegments = [];

    try {
      const mergedSegments = mergeSpeakerSegments(rawSegments);

      let mappedSegments = mapTextToSegments(mergedSegments, stt.segments);

      speakerSegments = removeDuplicateSegments(mappedSegments);

      speakerSegments = speakerSegments.map((seg) => ({
        ...seg,
        text: normalizeText(seg.text),
      }));
    } catch (err) {
      console.warn("⚠ Diarization fallback:", err.message);

      speakerSegments = stt.segments.map((seg, index) => ({
        start: seg.start,
        end: seg.end,
        speaker: index % 2 === 0 ? "SPEAKER_0" : "SPEAKER_1",
        text: normalizeText(seg.text),
      }));
    }

    const finalText = normalizeText(stt.cleanText || stt.rawText || "");

    /* ===================================================
       🔥 IMPORTANT FIX:
       CHỈ MỞ TRANSACTION KHI GHI DB
    =================================================== */
    console.time("⏱ DB SAVE");

    const transaction = await db.sequelize.transaction();

    try {
      const saveTasks = [];

      saveTasks.push(
        db.Transcript.create(
          {
            conversationId,
            content: finalText,
          },
          { transaction },
        ),
      );

      if (speakerSegments.length > 0) {
        saveTasks.push(
          db.SpeakerSegment.bulkCreate(
            speakerSegments.map((seg) => ({
              conversationId,
              speaker: seg.speaker,
              startTime: seg.start,
              endTime: seg.end,
              text: seg.text,
            })),
            { transaction },
          ),
        );
      }

      console.log("🔥 FINAL SPEAKER SEGMENTS LENGTH:", speakerSegments?.length);
      console.log(
        "🔥 FINAL SPEAKER SEGMENTS SAMPLE:",
        speakerSegments?.slice?.(0, 5),
      );

      const [transcript] = await Promise.all(saveTasks);

      await transaction.commit();

      console.timeEnd("⏱ DB SAVE");
      console.timeEnd("⏱ TOTAL UPLOAD PIPELINE");

      console.log("=======================================");

      return {
        errCode: 0,
        data: {
          conversationId,
          transcript,
          speakerSegments,
        },
      };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("❌ Upload Pipeline Error:", err);

    return {
      errCode: 1,
      message: err.message,
    };
  }
};

// const handleAnalyzeEmotionService = async (conversationId) => {
//   try {
//     console.time("⏱ EMOTION PIPELINE");

//     /* =========================
//        1. GET SEGMENTS
//     ========================= */
//     const segments = await db.SpeakerSegment.findAll({
//       where: { conversationId },
//       order: [["startTime", "ASC"]],
//     });

//     if (!segments.length) {
//       return {
//         errCode: 1,
//         message: "No segments",
//       };
//     }

//     /* =========================
//        2. GROUP TEXT
//     ========================= */
//     const grouped = {};

//     segments.forEach((seg) => {
//       if (!seg.text?.trim()) return;

//       const speakerKey = seg.speaker;

//       if (!grouped[speakerKey]) {
//         grouped[speakerKey] = [];
//       }

//       grouped[speakerKey].push(seg.text);
//     });

//     Object.keys(grouped).forEach((key) => {
//       grouped[key] = grouped[key].join(" ");
//     });

//     /* =========================
//        3. AI ANALYSIS
//     ========================= */
//     const ai = await analyzeEmotionService({
//       speakers: grouped,
//     });

//     if (ai.errCode !== 0) {
//       return ai;
//     }

//     const result = ai.data;

//     const aiSpeakers = result?.speakers || {};

//     const roles = Object.values(aiSpeakers).map((s) => s.role);

//     const isValidAI =
//       roles.length === 2 &&
//       roles.includes("staff") &&
//       roles.includes("customer");

//     console.log("🧠 AI ROLE CHECK:", roles, "| valid =", isValidAI);

//     await db.AnalysisResult.create({
//       conversationId,
//       sentiment: "processing", // 🔥 placeholder
//       score: 0,
//       emotion: result?.overall?.emotion || null,
//       confidence: result?.overall?.confidence || null,
//       customerScore: null,
//       staffScore: null,
//     });

//     /* =========================
//        5. SAVE SPEAKER BULK
//     ========================= */
//     const speakerPayload = [];

//     for (const rawSpeaker in result.speakers) {
//       const speaker = normalizeSpeakerKey(rawSpeaker);
//       const sp = result.speakers[rawSpeaker] || {};

//       const speakerText = grouped[speaker] || "";

//       const scoreResult = calculateFinalScore(sp?.emotions || {});

//       const score = scoreResult.score;

//       let sentimentLevel;

//       if (sp?.confidence >= 0.7) {
//         // 🔥 tin AI nếu confidence cao
//         sentimentLevel = sp.sentiment;
//       } else {
//         // fallback sang tính toán
//         sentimentLevel = classifySentimentLevel(score);
//       }

//       let finalRole;

//       if (isValidAI) {
//         finalRole = sp.role; // 🔥 TRUST AI
//       } else {
//         finalRole = detectHardRoleV2(speakerText, sp?.role || "unknown"); // 🔥 FALLBACK
//       }

//       speakerPayload.push({
//         conversationId,
//         speakerLabel: speaker,
//         role: finalRole,
//         sentiment: sentimentLevel,
//         emotion: sp?.emotion,
//         score,
//         // emotionDetail: scoreResult.emotions,
//         confidence: sp?.confidence,
//       });
//     }

//     await db.SpeakerAnalysisResult.bulkCreate(speakerPayload);

//     await updateFinalAnalysisScore(conversationId);

//     /* =========================
//        6. RECALC KPI
//     ========================= */
//     const conversation = await db.Conversation.findByPk(conversationId);

//     const userId = conversation?.userId;
//     const crateDate = conversation?.createdAt;

//     if (userId) {
//       await recalcUserMonthlyStats(userId, crateDate);
//     }

//     console.timeEnd("⏱ EMOTION PIPELINE");

//     return {
//       errCode: 0,
//       data: {
//         speakerAnalysis: speakerPayload,
//       },
//     };
//   } catch (err) {
//     console.error("❌ Emotion Pipeline Error:", err);

//     return {
//       errCode: 1,
//       message: err.message,
//     };
//   }
// };

const handleAnalyzeEmotionService = async (conversationId) => {
  try {
    console.time("⏱ EMOTION PIPELINE");

    /* =========================
       1. GET SEGMENTS
    ========================= */
    const segments = await db.SpeakerSegment.findAll({
      where: { conversationId },
      order: [["startTime", "ASC"]],
    });

    if (!segments.length) {
      return {
        errCode: 1,
        message: "No segments",
      };
    }

    /* =========================
       2. PREPARE SEGMENTS + GROUP TEXT
    ========================= */
    const aiSegments = [];
    const grouped = {};

    segments.forEach((seg) => {
      if (!seg.text?.trim()) return;

      const speakerKey = normalizeSpeakerKey(seg.speaker);

      aiSegments.push({
        id: seg.id,
        speaker: speakerKey,
        text: seg.text.trim(),
      });

      if (!grouped[speakerKey]) {
        grouped[speakerKey] = [];
      }

      grouped[speakerKey].push(seg.text.trim());
    });

    Object.keys(grouped).forEach((key) => {
      grouped[key] = grouped[key].join(" ");
    });

    /* =========================
       3. AI ANALYSIS
    ========================= */
    const ai = await analyzeEmotionService({
      segments: aiSegments,
    });

    if (ai.errCode !== 0) {
      return ai;
    }

    const result = ai.data;

    const aiSpeakers = result?.speakers || {};
    const aiSegmentResults = result?.segments || [];

    const roles = Object.values(aiSpeakers).map((s) => s.role);

    const isValidAI =
      roles.length === 2 &&
      roles.includes("staff") &&
      roles.includes("customer");

    console.log("🧠 AI ROLE CHECK:", roles, "| valid =", isValidAI);

    await db.AnalysisResult.create({
      conversationId,
      sentiment: "processing",
      score: 0,
      emotion: null,
      confidence: null,
      customerScore: null,
      staffScore: null,
    });

    /* =========================
       4. SAVE SEGMENT EMOTION
    ========================= */
    for (const item of aiSegmentResults) {
      await db.SpeakerSegment.update(
        {
          emotion: item.emotion || "neutral",
          emotionScore: typeof item.score === "number" ? item.score : 0.5,
          emotionConfidence:
            typeof item.confidence === "number" ? item.confidence : 0.5,
        },
        {
          where: {
            id: item.id,
            conversationId,
          },
        },
      );
    }

    /* =========================
       5. AGGREGATE SEGMENT -> SPEAKER
    ========================= */
    const updatedSegments = await db.SpeakerSegment.findAll({
      where: { conversationId },
      order: [["startTime", "ASC"]],
    });

    // const speakerPayload = [];
    const tempSpeakerPayload = [];
    const roleMap = {};
    const scoreMap = {};

    for (const speaker in grouped) {
      const sp = aiSpeakers[speaker] || {};
      const speakerText = grouped[speaker] || "";

      const speakerSegments = updatedSegments.filter(
        (seg) =>
          normalizeSpeakerKey(seg.speaker) === speaker && seg.text?.trim(),
      );

      let totalScore = 0;
      let totalConfidence = 0;
      let count = 0;
      const emotionCount = {};

      speakerSegments.forEach((seg) => {
        const score =
          typeof seg.emotionScore === "number" ? seg.emotionScore : 0.5;

        const confidence =
          typeof seg.emotionConfidence === "number"
            ? seg.emotionConfidence
            : 0.5;

        const emotion = seg.emotion || "neutral";

        totalScore += score;
        totalConfidence += confidence;
        count++;

        emotionCount[emotion] = (emotionCount[emotion] || 0) + 1;
      });

      const score = count ? totalScore / count : 0.5;
      const avgConfidence = count ? totalConfidence / count : 0.5;

      const mainEmotion =
        Object.entries(emotionCount).sort((a, b) => b[1] - a[1])[0]?.[0] ||
        "neutral";

      const sentimentLevel = classifySentimentLevel(score);

      // let finalRole;

      // if (isValidAI) {
      //   finalRole = sp.role;
      // } else {
      //   finalRole = detectHardRoleV2(speakerText, sp?.role || "unknown");
      // }

      const hardRoleResult = detectHardRoleV2(
        speakerText,
        sp?.role || "unknown",
      );

      roleMap[speaker] = hardRoleResult.role;
      scoreMap[speaker] = {
        staffScore: hardRoleResult.staffScore,
        customerScore: hardRoleResult.customerScore,
      };

      tempSpeakerPayload.push({
        conversationId,
        speakerLabel: speaker,
        // role: finalRole,
        sentiment: sentimentLevel,
        emotion: mainEmotion,
        score,
        confidence: avgConfidence,
      });
    }

    const resolvedRoleMap = resolveRolePair(roleMap, scoreMap, aiSpeakers);

    const speakerPayload = tempSpeakerPayload.map((item) => ({
      ...item,
      role: resolvedRoleMap[item.speakerLabel] || "customer",
    }));

    await db.SpeakerAnalysisResult.bulkCreate(speakerPayload);

    await updateFinalAnalysisScore(conversationId);

    /* =========================
       6. RECALC KPI
    ========================= */
    const conversation = await db.Conversation.findByPk(conversationId);

    const userId = conversation?.userId;
    const crateDate = conversation?.createdAt;

    if (userId) {
      await recalcUserMonthlyStats(userId, crateDate);
    }

    console.timeEnd("⏱ EMOTION PIPELINE");

    return {
      errCode: 0,
      data: {
        speakerAnalysis: speakerPayload,
      },
    };
  } catch (err) {
    console.error("❌ Emotion Pipeline Error:", err);

    return {
      errCode: 1,
      message: err.message,
    };
  }
};

const handleAnalyzeVoiceToneService = async (conversationId, audioPath) => {
  try {
    console.log("\n🎤 SPEAKER TONE ANALYSIS");
    console.log("===================================");

    const segments = await db.SpeakerSegment.findAll({
      where: { conversationId },
      order: [["startTime", "ASC"]],
    });

    if (!segments.length) {
      return { errCode: 1, message: "No speaker segments" };
    }

    const tempDir = ensureTempDir();

    /* =========================
       1. PREDICT + SAVE TO SPEAKERSEGMENT
    ========================= */
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];

      const tempFile = path.join(
        tempDir,
        `${seg.speaker}_${seg.id}_${Date.now()}.wav`,
      );

      try {
        await cutAudioSegment(audioPath, seg.startTime, seg.endTime, tempFile);

        const ai = await predictToneService(tempFile);

        const toneEmotion = normalizeToneEmotion(ai.data?.emotion);
        // const toneScore = Number(ai.data?.score ?? 0.5);
        const toneConfidence = Number(ai.data?.confidence ?? 0);
        const toneDetail = normalizeToneProbs(ai.data?.emotions || {});
        const { score: toneScore } = calculateVoiceScore(toneDetail);

        const [updatedRows] = await db.SpeakerSegment.update(
          {
            toneEmotion,
            toneScore,
            toneConfidence,
            toneDetail,
          },
          {
            where: {
              id: seg.id,
              conversationId,
            },
          },
        );
        console.log("UPDATED SEGMENT ROWS =", updatedRows);

        console.log(
          `→ segment=${seg.id} | ${seg.speaker} | ${toneEmotion} | score=${toneScore.toFixed(
            2,
          )} | confidence=${toneConfidence.toFixed(2)}`,
        );
      } catch (err) {
        console.warn(`Segment ${seg.id} failed:`, err.message);
      } finally {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
      }
    }

    /* =========================
       2. READ SAVED SEGMENTS
    ========================= */
    const updatedSegments = await db.SpeakerSegment.findAll({
      where: { conversationId },
      order: [["startTime", "ASC"]],
    });

    const grouped = {};

    updatedSegments.forEach((seg) => {
      if (!grouped[seg.speaker]) grouped[seg.speaker] = [];
      grouped[seg.speaker].push(seg);
    });

    const results = [];

    /* =========================
       3. AGGREGATE FROM SPEAKERSEGMENT
    ========================= */
    for (const speaker in grouped) {
      console.log(`\n🔹 ${speaker}`);

      const segs = grouped[speaker];

      const emotionStats = {
        happy: 0,
        sad: 0,
        angry: 0,
        fear: 0,
        surprise: 0,
        disgust: 0,
        neutral: 0,
      };

      let totalConfidence = 0;
      let count = 0;

      segs.forEach((seg) => {
        const toneConfidence = Number(seg.toneConfidence ?? 0);
        const toneDetail = seg.toneDetail || {};

        if (toneConfidence < 0.4) return;

        Object.keys(emotionStats).forEach((emo) => {
          emotionStats[emo] += Number(toneDetail[emo] || 0);
        });

        totalConfidence += toneConfidence;
        count++;
      });

      if (count === 0) {
        results.push({
          conversationId,
          speakerLabel: speaker,
          toneEmotion: "neutral",
          toneConfidence: 0,
          toneScore: 0.5,
          toneSentiment: "neutral",
        });
        continue;
      }

      const total = Object.values(emotionStats).reduce((a, b) => a + b, 0);

      if (emotionStats.disgust < total * 0.15) {
        emotionStats.disgust = 0;
      }

      const avgConfidence = totalConfidence / count;

      const { score, emotions } = calculateVoiceScore(emotionStats);

      const sentiment = classifySentimentLevel(score);

      const toneEmotion = Object.entries(emotions).reduce((max, curr) =>
        curr[1] > max[1] ? curr : max,
      )[0];

      console.log(`AVG SCORE: ${score.toFixed(2)}`);

      results.push({
        conversationId,
        speakerLabel: speaker,
        toneEmotion,
        toneConfidence: avgConfidence,
        toneScore: score,
        toneSentiment: sentiment,
      });
    }

    /* =========================
       4. SAVE VOICETONERESULT
    ========================= */
    await db.VoiceToneResult.bulkCreate(results);

    await db.Conversation.update(
      { status: "completed" },
      { where: { id: conversationId } },
    );

    console.log("\n===================================\n");

    return { errCode: 0, data: results };
  } catch (e) {
    console.error("❌ Voice Tone Error:", e);
    return { errCode: 1, message: e.message };
  }
};

// const handleAnalyzeVoiceToneService = async (conversationId, audioPath) => {
//   try {
//     console.log("\n🎤 SPEAKER TONE ANALYSIS");
//     console.log("===================================");

//     const segments = await db.SpeakerSegment.findAll({
//       where: { conversationId },
//       order: [["startTime", "ASC"]],
//     });

//     if (!segments.length) {
//       return { errCode: 1, message: "No speaker segments" };
//     }

//     const tempDir = ensureTempDir();

//     // group theo speaker
//     const grouped = {};
//     segments.forEach((seg) => {
//       if (!grouped[seg.speaker]) grouped[seg.speaker] = [];
//       grouped[seg.speaker].push(seg);
//     });

//     const results = [];

//     for (const speaker in grouped) {
//       console.log(`\n🔹 ${speaker}`);

//       const segs = grouped[speaker];

//       const emotionStats = {
//         happy: 0,
//         sad: 0,
//         angry: 0,
//         fear: 0,
//         surprise: 0,
//         disgust: 0,
//         neutral: 0,
//       };

//       let totalConfidence = 0;
//       let count = 0;

//       for (let i = 0; i < segs.length; i++) {
//         const seg = segs[i];

//         const tempFile = path.join(
//           tempDir,
//           `${speaker}_${i}_${Date.now()}.wav`,
//         );

//         try {
//           await cutAudioSegment(
//             audioPath,
//             seg.startTime,
//             seg.endTime,
//             tempFile,
//           );

//           const ai = await predictToneService(tempFile);

//           // const probs = ai.data.emotions || {};
//           // const confidence = ai.data.confidence || 0;

//           // if (confidence < 0.4) continue;

//           // Object.keys(emotionStats).forEach((emo) => {
//           //   emotionStats[emo] += probs[emo] || 0;
//           // });
//           const rawEmotion = ai.data.emotion || "neutral";
//           const toneEmotion = normalizeToneEmotion(rawEmotion);
//           const toneScore = Number(ai.data.score ?? 0.5);
//           const toneConfidence = Number(ai.data.confidence ?? 0);
//           const probs = ai.data.emotions || {};

//           // lưu voice tone chi tiết vào đúng segment
//           await db.SpeakerSegment.update(
//             {
//               toneEmotion,
//               toneScore,
//               toneConfidence,
//             },
//             {
//               where: {
//                 id: seg.id,
//                 conversationId,
//               },
//             },
//           );

//           if (toneConfidence < 0.4) {
//             fs.unlinkSync(tempFile);
//             continue;
//           }

//           Object.keys(emotionStats).forEach((emo) => {
//             const sourceKey =
//               emo === "fear"
//                 ? "fearful"
//                 : emo === "surprise"
//                   ? "surprised"
//                   : emo;

//             emotionStats[emo] += probs[sourceKey] || probs[emo] || 0;
//           });

//           console.log(
//             `→ segment=${seg.id} | ${toneEmotion} | score=${toneScore.toFixed(
//               2,
//             )} | confidence=${toneConfidence.toFixed(2)}`,
//           );

//           // totalConfidence += confidence;
//           totalConfidence += toneConfidence;
//           count++;

//           fs.unlinkSync(tempFile);
//         } catch (err) {
//           console.warn("Segment failed:", err);
//         }
//       }

//       // ===== SAU LOOP SEGMENTS =====
//       if (count === 0) {
//         results.push({
//           conversationId,
//           speakerLabel: speaker,
//           toneEmotion: "neutral",
//           toneConfidence: 0,
//           toneScore: 0.5,
//           toneSentiment: "neutral",
//         });
//         continue;
//       }

//       // 🔥 FIX DISGUST
//       const total = Object.values(emotionStats).reduce((a, b) => a + b, 0);

//       if (emotionStats.disgust < total * 0.15) {
//         emotionStats.disgust = 0;
//       }

//       // const avgScore = count ? totalScore / count : 0;
//       const avgConfidence = count ? totalConfidence / count : 0;
//       const { score, emotions } = calculateVoiceScore(emotionStats);
//       const sentiment = classifySentimentLevel(score);
//       const toneEmotion = Object.entries(emotions).reduce((max, curr) =>
//         curr[1] > max[1] ? curr : max,
//       )[0];

//       console.log(`AVG SCORE: ${score.toFixed(2)}`);

//       results.push({
//         conversationId,
//         speakerLabel: speaker,
//         toneEmotion,
//         toneConfidence: avgConfidence,
//         toneScore: score,
//         toneSentiment: sentiment,
//       });
//     }

//     // save DB
//     await db.VoiceToneResult.bulkCreate(results);
//     // await updateFinalAnalysisScore(conversationId);
//     // const conversation = await db.Conversation.findByPk(conversationId);

//     // if (conversation?.userId) {
//     //   await recalcUserMonthlyStats(conversation.userId);
//     // }

//     /* =========================
//        OPTIONAL: UPDATE STATUS
//     ========================= */
//     await db.Conversation.update(
//       { status: "completed" },
//       { where: { id: conversationId } },
//     );

//     console.log("\n===================================\n");

//     return { errCode: 0, data: results };
//   } catch (e) {
//     console.error("❌ Voice Tone Error:", e);
//     return { errCode: 1, message: e.message };
//   }
// };

export {
  handleUploadAudioService,
  handleAnalyzeEmotionService,
  handleAnalyzeVoiceToneService,
};
