// import db from "../../models/index.js";
// import { speechToTextService } from "../ai/sttService.js";
// import {
//   analyzeEmotionService,
//   // refineTextWithGPT,
// } from "../ai/emotionService.js";
// import { diarizationService } from "../ai/diarizationService.js";
// import {
//   mapTextToSegments,
//   removeDuplicateSegments,
// } from "../ai/speakerMappingService.js";
// import { mergeSpeakerSegments } from "../ai/segmentService.js";
// import {
//   calculateFinalScore,
//   classifySentimentLevel,
// } from "../domain/scoringService.js";
// import { recalcUserMonthlyStats } from "../dashboardService.js";

// const normalizeText = (text) => {
//   if (!text) return "";

//   return text
//     .replace(/\s+/g, " ")
//     .replace(/([,.!?])\1+/g, "$1")
//     .replace(/\s([,.!?])/g, "$1")
//     .trim();
// };

// const handleUploadAudioService = async (conversationId, userId, audioPath) => {
//   const transaction = await db.sequelize.transaction();

//   try {
//     const user = await db.User.findByPk(userId);
//     if (!user) throw new Error("User not found");

//     const conversation = await db.Conversation.findByPk(conversationId);
//     if (!conversation) throw new Error("Conversation not found");

//     /* =========================
//        🔥 PARALLEL STT + DIARIZATION
//     ========================= */
//     // const [stt, rawSegments] = await Promise.all([
//     //   speechToTextService(audioPath),
//     //   diarizationService(audioPath),
//     // ]);

//     const sttStart = Date.now();

//     const sttPromise = speechToTextService(audioPath);

//     const diaStart = Date.now();

//     const diaPromise = diarizationService(audioPath);

//     const [stt, rawSegments] = await Promise.all([sttPromise, diaPromise]);

//     console.log(
//       "⏱ STT TIME:",
//       ((Date.now() - sttStart) / 1000).toFixed(2),
//       "s",
//     );

//     console.log(
//       "⏱ DIARIZATION TIME:",
//       ((Date.now() - diaStart) / 1000).toFixed(2),
//       "s",
//     );

//     if (stt.errCode !== 0) throw new Error("STT failed");

//     let speakerSegments = [];

//     try {
//       const mergedSegments = mergeSpeakerSegments(rawSegments);
//       let mappedSegments = mapTextToSegments(mergedSegments, stt.segments);
//       speakerSegments = removeDuplicateSegments(mappedSegments);

//       /* =========================
//          🔥 CLEAN TEXT NHẸ (THAY refine GPT)
//       ========================= */
//       speakerSegments = speakerSegments.map((seg) => ({
//         ...seg,
//         text: normalizeText(seg.text),
//       }));
//     } catch (e) {
//       console.warn("Diarization failed:", e.message);

//       speakerSegments = stt.segments.map((seg, index) => ({
//         start: seg.start,
//         end: seg.end,
//         speaker: index % 2 === 0 ? "SPEAKER_0" : "SPEAKER_1",
//         text: normalizeText(seg.text),
//       }));
//     }

//     /* =========================
//        🔥 CLEAN TRANSCRIPT
//     ========================= */
//     const finalText = normalizeText(stt.cleanText || stt.rawText || "");

//     const saveTasks = [];

//     saveTasks.push(
//       db.Transcript.create(
//         {
//           conversationId: conversation.id,
//           content: finalText,
//         },
//         { transaction },
//       ),
//     );

//     if (speakerSegments.length > 0) {
//       saveTasks.push(
//         db.SpeakerSegment.bulkCreate(
//           speakerSegments.map((seg) => ({
//             conversationId: conversation.id,
//             speaker: seg.speaker,
//             startTime: seg.start,
//             endTime: seg.end,
//             text: seg.text,
//           })),
//           { transaction },
//         ),
//       );
//     }

//     const [transcript] = await Promise.all(saveTasks);

//     await transaction.commit();

//     return {
//       errCode: 0,
//       data: {
//         conversationId: conversation.id,
//         transcript,
//         speakerSegments,
//       },
//     };
//   } catch (err) {
//     await transaction.rollback();

//     return {
//       errCode: 1,
//       message: err.message,
//     };
//   }
// };

// const handleAnalyzeEmotionService = async (conversationId) => {
//   try {
//     /* =========================
//        1. LẤY SEGMENTS (QUAN TRỌNG)
//     ========================= */
//     const segments = await db.SpeakerSegment.findAll({
//       where: { conversationId },
//       order: [["startTime", "ASC"]],
//     });

//     if (!segments.length) {
//       return { errCode: 1, message: "No segments" };
//     }

//     /* =========================
//        2. GROUP TEXT
//     ========================= */
//     const grouped = {};
//     let fullText = "";

//     segments.forEach((seg) => {
//       if (!seg.text?.trim()) return;

//       fullText += seg.text + " ";

//       if (!grouped[seg.speaker]) grouped[seg.speaker] = [];
//       grouped[seg.speaker].push(seg.text);
//     });

//     Object.keys(grouped).forEach((k) => {
//       grouped[k] = grouped[k].join(" ");
//     });

//     /* =========================
//        3. 🔥 CALL AI 1 LẦN
//     ========================= */
//     const ai = await analyzeEmotionService({
//       fullText,
//       speakers: grouped,
//     });

//     if (ai.errCode !== 0) return ai;

//     const result = ai.data;

//     /* =========================
//        4. SAVE OVERALL
//     ========================= */
//     const score = calculateFinalScore(result.overall.emotions);
//     const sentimentLevel = classifySentimentLevel(score);

//     const analysis = await db.AnalysisResult.create({
//       conversationId,
//       sentiment: sentimentLevel,
//       score,
//       emotion: result.overall.emotion,
//       voiceTone: result.overall.voiceTone,
//       emotionDetail: result.overall.emotions,
//       confidence: result.overall.confidence,
//     });

//     /* =========================
//        5. SAVE SPEAKER
//     ========================= */
//     const speakerPayload = [];

//     for (let speaker in result.speakers) {
//       const sp = result.speakers[speaker];

//       const score = calculateFinalScore(sp.emotions);
//       const sentimentLevel = classifySentimentLevel(score);

//       speakerPayload.push({
//         conversationId,
//         speakerLabel: speaker,
//         sentiment: sentimentLevel,
//         emotion: sp.emotion,
//         score,
//         voiceTone: sp.voiceTone,
//         emotionDetail: sp.emotions,
//         confidence: sp.confidence,
//         processingTime: ai.processingTime,
//       });
//     }

//     await db.SpeakerAnalysisResult.bulkCreate(speakerPayload);

//     const speakerResults = await db.SpeakerAnalysisResult.findAll({
//       where: { conversationId },
//     });

//     /* =========================
//        6. RECALC (GIỮ NGUYÊN)
//     ========================= */
//     const conversation = await db.Conversation.findByPk(conversationId);
//     const userId = conversation?.userId;

//     if (userId) {
//       await recalcUserMonthlyStats(userId);
//     }

//     return {
//       errCode: 0,
//       data: {
//         analysis,
//         speakerAnalysis: speakerResults,
//       },
//     };
//   } catch (err) {
//     return {
//       errCode: 1,
//       message: err.message,
//     };
//   }
// };
// export { handleUploadAudioService, handleAnalyzeEmotionService };

import db from "../../models/index.js";
import { speechToTextService } from "../ai/sttService.js";
import { analyzeEmotionService } from "../ai/emotionService.js";
import { diarizationService } from "../ai/diarizationService.js";
import {
  mapTextToSegments,
  removeDuplicateSegments,
} from "../ai/speakerMappingService.js";
import { mergeSpeakerSegments } from "../ai/segmentService.js";
import {
  calculateFinalScore,
  classifySentimentLevel,
  detectHardRoleV2,
} from "../domain/scoringService.js";
import { recalcUserMonthlyStats } from "../dashboardService.js";

const normalizeText = (text) => {
  if (!text) return "";

  return text
    .replace(/\s+/g, " ")
    .replace(/([,.!?])\1+/g, "$1")
    .replace(/\s([,.!?])/g, "$1")
    .trim();
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

//       const speakerKey = seg.speaker
//         .replace("SPEAKER_00", "SPEAKER_0")
//         .replace("SPEAKER_01", "SPEAKER_1");

//       if (!grouped[seg.speaker]) {
//         grouped[seg.speaker] = [];
//       }

//       grouped[seg.speaker].push(seg.text);
//     });

//     Object.keys(grouped).forEach((key) => {
//       grouped[key] = grouped[key].join(" ");
//     });

//     /* =========================
//        3. AI ANALYSIS
//        🔥 ONLY SEND speakers
//     ========================= */
//     const ai = await analyzeEmotionService({
//       speakers: grouped,
//     });

//     if (ai.errCode !== 0) {
//       return ai;
//     }

//     const result = ai.data;

//     /* =========================
//        4. SAVE OVERALL
//     ========================= */
//     const score = calculateFinalScore(result.overall.emotions);

//     const sentimentLevel = classifySentimentLevel(score);

//     const analysis = await db.AnalysisResult.create({
//       conversationId,
//       sentiment: sentimentLevel,
//       score,
//       emotion: result.overall.emotion,
//       voiceTone: result.overall.voiceTone,
//       emotionDetail: result.overall.emotions,
//       confidence: result.overall.confidence,
//     });

//     /* =========================
//        5. SAVE SPEAKER BULK
//     ========================= */
//     // const speakerPayload = [];

//     // for (const speaker in result.speakers) {
//     //   const sp = result.speakers[speaker];

//     //   const speakerText = grouped[speaker] || "";

//     //   const score = calculateFinalScore(sp.emotions);

//     //   const sentimentLevel = classifySentimentLevel(score);

//     //   const finalRole = detectHardRoleV2(speakerText, sp?.role || "unknown");

//     //   speakerPayload.push({
//     //     conversationId,
//     //     speakerLabel: speaker,
//     //     role: finalRole,
//     //     sentiment: sentimentLevel,
//     //     emotion: sp.emotion,
//     //     score,
//     //     voiceTone: sp.voiceTone,
//     //     emotionDetail: sp.emotions,
//     //     confidence: sp.confidence,
//     //     processingTime: ai.processingTime,
//     //   });
//     // }

//     // await db.SpeakerAnalysisResult.bulkCreate(speakerPayload);

//     const speakerPayload = [];

//     for (const speaker in result.speakers) {
//       const sp = result.speakers[speaker] || {};

//       const speakerText = grouped[speaker] || "";

//       // fallback emotions để tránh {}
//       const safeEmotions = {
//         happy: sp?.emotions?.happy,
//         sad: sp?.emotions?.sad,
//         angry: sp?.emotions?.angry,
//         fear: sp?.emotions?.fear,
//         surprise: sp?.emotions?.surprise,
//         disgust: sp?.emotions?.disgust,
//         neutral: sp?.emotions?.neutral,
//       };

//       const score = calculateFinalScore(safeEmotions);

//       const sentimentLevel = classifySentimentLevel(score);

//       const finalRole = detectHardRoleV2(speakerText, sp?.role || "unknown");

//       speakerPayload.push({
//         conversationId,
//         speakerLabel: speaker,
//         role: finalRole,
//         sentiment: sentimentLevel,
//         emotion: sp?.emotion,
//         score,
//         voiceTone: sp?.voiceTone,
//         emotionDetail: safeEmotions,
//         confidence: sp?.confidence,
//         processingTime: ai.processingTime,
//       });
//     }

//     await db.SpeakerAnalysisResult.bulkCreate(speakerPayload);

//     /* =========================
//        6. RECALC KPI
//     ========================= */
//     const conversation = await db.Conversation.findByPk(conversationId);

//     const userId = conversation?.userId;

//     if (userId) {
//       await recalcUserMonthlyStats(userId);
//     }

//     console.timeEnd("⏱ EMOTION PIPELINE");

//     return {
//       errCode: 0,
//       data: {
//         analysis,
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
       2. GROUP TEXT
    ========================= */
    const grouped = {};

    segments.forEach((seg) => {
      if (!seg.text?.trim()) return;

      const speakerKey = seg.speaker
        .replace("SPEAKER_00", "SPEAKER_0")
        .replace("SPEAKER_01", "SPEAKER_1");

      if (!grouped[speakerKey]) {
        grouped[speakerKey] = [];
      }

      grouped[speakerKey].push(seg.text);
    });

    Object.keys(grouped).forEach((key) => {
      grouped[key] = grouped[key].join(" ");
    });

    /* =========================
       3. AI ANALYSIS
    ========================= */
    const ai = await analyzeEmotionService({
      speakers: grouped,
    });

    if (ai.errCode !== 0) {
      return ai;
    }

    const result = ai.data;

    /* =========================
       4. SAVE OVERALL
    ========================= */
    const overallResult = calculateFinalScore(result?.overall?.emotions || {});

    const overallScore = overallResult.score;

    const sentimentLevel = classifySentimentLevel(overallScore);

    const analysis = await db.AnalysisResult.create({
      conversationId,
      sentiment: sentimentLevel,
      score: overallScore,
      emotion: result?.overall?.emotion,
      voiceTone: result?.overall?.voiceTone,
      emotionDetail: overallResult.emotions,
      confidence: result?.overall?.confidence,
    });

    /* =========================
       5. SAVE SPEAKER BULK
    ========================= */
    const speakerPayload = [];

    for (const speaker in result.speakers) {
      const sp = result.speakers[speaker] || {};

      const speakerText = grouped[speaker] || "";

      const scoreResult = calculateFinalScore(sp?.emotions || {});

      const score = scoreResult.score;

      const sentimentLevel = classifySentimentLevel(score);

      const finalRole = detectHardRoleV2(speakerText, sp?.role || "unknown");

      speakerPayload.push({
        conversationId,
        speakerLabel: speaker,
        role: finalRole,
        sentiment: sentimentLevel,
        emotion: sp?.emotion,
        score,
        voiceTone: sp?.voiceTone,
        emotionDetail: scoreResult.emotions,
        confidence: sp?.confidence,
        processingTime: ai.processingTime,
      });
    }

    await db.SpeakerAnalysisResult.bulkCreate(speakerPayload);

    /* =========================
       6. RECALC KPI
    ========================= */
    const conversation = await db.Conversation.findByPk(conversationId);

    const userId = conversation?.userId;

    if (userId) {
      await recalcUserMonthlyStats(userId);
    }

    console.timeEnd("⏱ EMOTION PIPELINE");

    return {
      errCode: 0,
      data: {
        analysis,
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

export { handleUploadAudioService, handleAnalyzeEmotionService };
