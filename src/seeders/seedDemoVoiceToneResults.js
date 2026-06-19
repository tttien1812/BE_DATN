import db from "../models/index.js";
import { Op } from "sequelize";

const getSentiment = (score) => {
  if (score < 0.35) return "very_negative";
  if (score < 0.5) return "negative";
  if (score < 0.65) return "neutral";
  if (score < 0.8) return "positive";
  return "very_positive";
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

const getMainToneEmotion = (segments) => {
  const count = {};

  for (const segment of segments) {
    if (!segment.toneEmotion) continue;
    count[segment.toneEmotion] = (count[segment.toneEmotion] || 0) + 1;
  }

  const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]);

  return sorted[0]?.[0] || "neutral";
};

const seedDemoVoiceToneResults = async () => {
  const transaction = await db.sequelize.transaction();

  try {
    console.log("===== SEED DEMO VOICE TONE RESULTS =====");

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
      const existed = await db.VoiceToneResult.count({
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

      const speaker00ToneScore = average(
        speaker00Segments.map((item) => item.toneScore),
      );

      const speaker01ToneScore = average(
        speaker01Segments.map((item) => item.toneScore),
      );

      const speaker00ToneConfidence = average(
        speaker00Segments.map((item) => item.toneConfidence),
      );

      const speaker01ToneConfidence = average(
        speaker01Segments.map((item) => item.toneConfidence),
      );

      await db.VoiceToneResult.bulkCreate(
        [
          {
            conversationId: conversation.id,
            speakerLabel: "SPEAKER_00",
            toneEmotion: getMainToneEmotion(speaker00Segments),
            toneScore: speaker00ToneScore,
            toneSentiment: getSentiment(speaker00ToneScore),
            toneConfidence: speaker00ToneConfidence,
            role: null,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
          },
          {
            conversationId: conversation.id,
            speakerLabel: "SPEAKER_01",
            toneEmotion: getMainToneEmotion(speaker01Segments),
            toneScore: speaker01ToneScore,
            toneSentiment: getSentiment(speaker01ToneScore),
            toneConfidence: speaker01ToneConfidence,
            role: null,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
          },
        ],
        { transaction },
      );
    }

    await transaction.commit();

    console.log("✅ Tạo VoiceToneResult demo thành công");
    process.exit(0);
  } catch (error) {
    await transaction.rollback();

    console.error("❌ Tạo VoiceToneResult demo thất bại:", error);
    process.exit(1);
  }
};

seedDemoVoiceToneResults();
