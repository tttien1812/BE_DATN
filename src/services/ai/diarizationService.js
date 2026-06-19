import axios from "axios";
import {
  mapToneEmotionToScore,
  classifySentimentLevel,
} from "../domain/scoringService.js";

/* ==================================================
   CONFIG
================================================== */
const AI_BASE_URL = process.env.AI_SERVICE_URL || "http://127.0.0.1:8000";

const aiClient = axios.create({
  baseURL: AI_BASE_URL,
  timeout: 120000,
});

/* ==================================================
   COMMON ERROR HANDLER
================================================== */
const handleAIError = (serviceName, error) => {
  console.error(
    `${serviceName} API error:`,
    error.response?.data || error.message,
  );

  throw error;
};

/* ==================================================
   1. DIARIZATION (GIỮ NGUYÊN CHỨC NĂNG CŨ)
================================================== */
const diarizationService = async (audioPath) => {
  try {
    const response = await aiClient.post("/diarize", {
      file_path: audioPath,
    });

    console.log("🔥 RAW DIARIZATION RESPONSE:", response.data);

    if (response.data?.errCode !== 0) {
      throw new Error(response.data?.message || "Diarization failed");
    }

    const segments = response.data?.segments || [];

    console.log("🔥 DIARIZATION SEGMENTS LENGTH:", segments.length);
    console.log("🔥 DIARIZATION SEGMENTS SAMPLE:", segments.slice(0, 5));

    return segments.map((seg) => ({
      start: Number(seg.start),
      end: Number(seg.end),
      speaker: seg.speaker,
    }));
  } catch (error) {
    handleAIError("Diarization", error);
  }
};

// const predictToneService = async (audioPath) => {
//   try {
//     const response = await aiClient.post("/predict-tone", {
//       file_path: audioPath,
//     });
//     console.log("🔥 RAW AI RESPONSE:", response.data);

//     const emotion = response.data?.emotion || "neutral";
//     const confidence = Number(response.data?.confidence || 0);
//     const detail = response.data?.detail || null;

//     // NEW
//     // const score = mapToneEmotionToScore(emotion, confidence);
//     const score = Number(response.data?.score || 0.5);
//     const emotions = response.data?.emotions || {};
//     const sentiment = classifySentimentLevel(score);

//     return {
//       errCode: response.data?.errCode ?? 0,
//       data: {
//         emotion,
//         confidence,
//         detail,
//         score,
//         sentiment,
//         emotions: response.data?.emotions || {},
//         processingTime: response.data?.processingTime || 0,
//       },
//     };
//   } catch (error) {
//     handleAIError("Predict Tone", error);
//   }
// };

const predictToneService = async (audioPath) => {
  try {
    const response = await aiClient.post("/predict-tone", {
      file_path: audioPath,
    });

    console.log("🔥 RAW AI RESPONSE:", response.data);

    const emotion =
      response.data?.normalizedEmotion || response.data?.emotion || "neutral";

    const confidence = Number(response.data?.confidence || 0);

    const emotions =
      response.data?.emotionsNormalized || response.data?.emotions || {};

    return {
      errCode: response.data?.errCode ?? 0,

      data: {
        emotion,
        confidence,

        // AI không tính score nữa
        score: null,
        sentiment: null,

        emotions,

        rawEmotion: response.data?.rawEmotion || emotion,

        modelVersion: response.data?.modelVersion,

        processingTime: response.data?.processingTime || 0,
      },
    };
  } catch (error) {
    handleAIError("Predict Tone", error);
  }
};

export { diarizationService, predictToneService };
