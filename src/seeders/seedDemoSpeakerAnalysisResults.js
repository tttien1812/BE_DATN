import db from "../models/index.js";
import { Op } from "sequelize";

const randomFloat = (min, max) =>
  Number((Math.random() * (max - min) + min).toFixed(2));

const getSentiment = (score) => {
  if (score < 0.35) return "very_negative";
  if (score < 0.5) return "negative";
  if (score < 0.65) return "neutral";
  if (score < 0.8) return "positive";
  return "very_positive";
};

const getMainEmotionFromSegments = (segments) => {
  const count = {};

  for (const segment of segments) {
    if (!segment.emotion) continue;
    count[segment.emotion] = (count[segment.emotion] || 0) + 1;
  }

  const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]);

  return sorted[0]?.[0] || "neutral";
};

const average = (values) => {
  const validValues = values.filter(
    (value) =>
      value !== null && value !== undefined && !Number.isNaN(Number(value)),
  );

  if (!validValues.length) return 0.5;

  return Number(
    (
      validValues.reduce((sum, value) => sum + Number(value), 0) /
      validValues.length
    ).toFixed(4),
  );
};

const seedDemoSpeakerAnalysisResults = async () => {
  const transaction = await db.sequelize.transaction();

  try {
    console.log("===== SEED DEMO SPEAKER ANALYSIS RESULTS =====");

    const conversations = await db.Conversation.findAll({
      where: {
        audioUrl: {
          [Op.like]: "uploads/demo-audio-%",
        },
      },
      include: [
        {
          model: db.SpeakerSegment,
          as: "segments",
        },
      ],
      transaction,
    });

    if (!conversations.length) {
      throw new Error(
        "Không tìm thấy conversation demo. Hãy chạy seedDemoConversations.js và seedDemoSpeakerSegments.js trước.",
      );
    }

    for (const conversation of conversations) {
      const existed = await db.SpeakerAnalysisResult.count({
        where: {
          conversationId: conversation.id,
        },
        transaction,
      });

      if (existed > 0) continue;

      const segments = conversation.segments || [];

      const speaker00Segments = segments.filter(
        (item) => item.speaker === "SPEAKER_00",
      );

      const speaker01Segments = segments.filter(
        (item) => item.speaker === "SPEAKER_01",
      );

      const speaker00Score = average(
        speaker00Segments.map((item) => item.emotionScore),
      );

      const speaker01Score = average(
        speaker01Segments.map((item) => item.emotionScore),
      );

      const speaker00Confidence = average(
        speaker00Segments.map((item) => item.emotionConfidence),
      );

      const speaker01Confidence = average(
        speaker01Segments.map((item) => item.emotionConfidence),
      );

      await db.SpeakerAnalysisResult.bulkCreate(
        [
          {
            conversationId: conversation.id,
            speakerLabel: "SPEAKER_00",
            role: "staff",
            sentiment: getSentiment(speaker00Score),
            emotion: getMainEmotionFromSegments(speaker00Segments),
            score: speaker00Score,
            confidence: Number(
              Math.min(
                0.95,
                speaker00Confidence + randomFloat(-0.05, 0.03),
              ).toFixed(4),
            ),
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
          },
          {
            conversationId: conversation.id,
            speakerLabel: "SPEAKER_01",
            role: "customer",
            sentiment: getSentiment(speaker01Score),
            emotion: getMainEmotionFromSegments(speaker01Segments),
            score: speaker01Score,
            confidence: Number(
              Math.min(
                0.95,
                speaker01Confidence + randomFloat(-0.05, 0.03),
              ).toFixed(4),
            ),
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
          },
        ],
        { transaction },
      );
    }

    await transaction.commit();

    console.log("✅ Tạo SpeakerAnalysisResult demo thành công");
    process.exit(0);
  } catch (error) {
    await transaction.rollback();

    console.error("❌ Tạo SpeakerAnalysisResult demo thất bại:", error);
    process.exit(1);
  }
};

seedDemoSpeakerAnalysisResults();
