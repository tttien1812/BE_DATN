import db from "../../models/index.js";
import { speechToTextService } from "../ai/sttService.js";
import {
  analyzeEmotionService,
  refineTextWithGPT,
} from "../ai/emotionService.js";
import { diarizationService } from "../ai/diarizationService.js";
import {
  mapTextToSegments,
  removeDuplicateSegments,
} from "../ai/speakerMappingService.js";
import { mergeSpeakerSegments } from "../ai/segmentService.js";
import {
  calculateFinalScore,
  classifySentimentLevel,
} from "../domain/scoringService.js";
import { recalcUserMonthlyStats } from "../dashboardService.js";

/* =========================================================
   ✅ UPLOAD AUDIO (GIỮ NGUYÊN)
========================================================= */
const handleUploadAudioService = async (conversationId, userId, audioPath) => {
  const transaction = await db.sequelize.transaction();

  try {
    const user = await db.User.findByPk(userId);
    if (!user) throw new Error("User not found");

    // const conversation = await db.Conversation.create(
    //   { userId, audioUrl: audioPath },
    //   { transaction },
    // );

    const conversation = await db.Conversation.findByPk(conversationId);
    if (!conversation) throw new Error("Conversation not found");

    const stt = await speechToTextService(audioPath);
    if (stt.errCode !== 0) throw new Error("STT failed");

    let speakerSegments = [];

    try {
      const rawSegments = await diarizationService(audioPath);
      const mergedSegments = mergeSpeakerSegments(rawSegments);
      let mappedSegments = mapTextToSegments(mergedSegments, stt.segments);
      speakerSegments = removeDuplicateSegments(mappedSegments);

      const grouped = {};

      speakerSegments.forEach((seg) => {
        if (!seg.text?.trim()) return;
        if (!grouped[seg.speaker]) grouped[seg.speaker] = [];
        grouped[seg.speaker].push(seg);
      });

      for (let speaker in grouped) {
        const segments = grouped[speaker];
        const fullText = segments.map((s) => s.text).join(" ");

        const refined = await refineTextWithGPT(fullText);

        const parts = refined
          .split(/[.?!]/)
          .map((s) => s.trim())
          .filter(Boolean);

        segments.forEach((seg, i) => {
          seg.text = parts[i] || seg.text;
        });
      }
    } catch (e) {
      console.warn("Diarization failed:", e.message);

      speakerSegments = stt.segments.map((seg, index) => ({
        start: seg.start,
        end: seg.end,
        speaker: index % 2 === 0 ? "SPEAKER_0" : "SPEAKER_1",
        text: seg.text,
      }));
    }

    const transcript = await db.Transcript.create(
      {
        conversationId: conversation.id,
        content: stt.cleanText || stt.rawText || "",
      },
      { transaction },
    );

    if (speakerSegments.length > 0) {
      await db.SpeakerSegment.bulkCreate(
        speakerSegments.map((seg) => ({
          conversationId: conversation.id,
          speaker: seg.speaker,
          startTime: seg.start,
          endTime: seg.end,
          text: seg.text,
        })),
        { transaction },
      );
    }

    await transaction.commit();

    return {
      errCode: 0,
      data: {
        conversationId: conversation.id,
        transcript,
        speakerSegments,
      },
    };
  } catch (err) {
    await transaction.rollback();

    return {
      errCode: 1,
      message: err.message,
    };
  }
};

/* =========================================================
   ✅ ANALYZE EMOTION + SPEAKER ANALYSIS (🔥 MỚI)
========================================================= */
const handleAnalyzeEmotionService = async (conversationId) => {
  try {
    /* =========================
       1. LẤY TRANSCRIPT
    ========================= */
    const transcript = await db.Transcript.findOne({
      where: { conversationId },
    });

    if (!transcript) {
      return { errCode: 1, message: "Transcript not found" };
    }

    let text = transcript.content;

    /* =========================
       2. FALLBACK TEXT
    ========================= */
    if (!text || text.trim() === "") {
      const segments = await db.SpeakerSegment.findAll({
        where: { conversationId },
        order: [["startTime", "ASC"]],
      });

      text = segments.map((s) => s.text).join(" ");
    }

    if (!text || text.trim() === "") {
      return { errCode: 1, message: "Missing text" };
    }

    /* =========================
       3. ANALYZE TỔNG
    ========================= */
    const emotion = await analyzeEmotionService(text);

    if (emotion.errCode !== 0) return emotion;

    const score = calculateFinalScore(emotion.data.emotions);
    const sentimentLevel = classifySentimentLevel(score);

    const analysis = await db.AnalysisResult.create({
      conversationId,
      sentiment: sentimentLevel,
      score,
      emotion: emotion.data.emotion,
      voiceTone: emotion.data.voiceTone,
      emotionDetail: emotion.data.emotions,
      confidence: emotion.data.confidence,
    });

    /* =========================
       🔥 4. ANALYZE THEO SPEAKER
    ========================= */
    const segments = await db.SpeakerSegment.findAll({
      where: { conversationId },
      order: [["startTime", "ASC"]],
    });

    const grouped = {};

    segments.forEach((seg) => {
      if (!seg.text?.trim()) return;

      if (!grouped[seg.speaker]) grouped[seg.speaker] = [];
      grouped[seg.speaker].push(seg.text);
    });

    const speakerResults = [];

    for (let speaker in grouped) {
      const fullText = grouped[speaker].join(" ");

      if (!fullText.trim()) continue;

      const emotion = await analyzeEmotionService(fullText);
      if (emotion.errCode !== 0) continue;

      const score = calculateFinalScore(emotion.data.emotions);
      const sentimentLevel = classifySentimentLevel(score);

      const speakerAnalysis = await db.SpeakerAnalysisResult.create({
        conversationId,
        speakerLabel: speaker,
        sentiment: sentimentLevel,
        emotion: emotion.data.emotion,
        score,
        voiceTone: emotion.data.voiceTone,
        emotionDetail: emotion.data.emotions,
        confidence: emotion.data.confidence,
        processingTime: emotion.data.processingTime,
      });

      speakerResults.push(speakerAnalysis);
    }

    const conversation = await db.Conversation.findByPk(conversationId);
    const userId = conversation?.userId;

    if (userId) {
      await recalcUserMonthlyStats(userId);
    }

    /* =========================
       RETURN
    ========================= */
    return {
      errCode: 0,
      data: {
        analysis,
        speakerAnalysis: speakerResults,
      },
    };
  } catch (err) {
    return {
      errCode: 1,
      message: err.message,
    };
  }
};

export { handleUploadAudioService, handleAnalyzeEmotionService };
