import db from "../models/index.js";
import { Op } from "sequelize";

const clamp = (value) => Number(Math.max(0, Math.min(1, value)).toFixed(4));

const getSentiment = (score) => {
  if (score < 0.35) return "very_negative";
  if (score < 0.5) return "negative";
  if (score < 0.65) return "neutral";
  if (score < 0.8) return "positive";
  return "very_positive";
};

const getEmotionByScore = (score) => {
  if (score < 0.35) return "angry";
  if (score < 0.5) return "sad";
  if (score < 0.65) return "neutral";
  if (score < 0.8) return "happy";
  return "happy";
};

const average = (values) => {
  const validValues = values.filter(
    (value) =>
      value !== null && value !== undefined && !Number.isNaN(Number(value)),
  );

  if (!validValues.length) return 0.7;

  return clamp(
    validValues.reduce((sum, value) => sum + Number(value), 0) /
      validValues.length,
  );
};

const seedDemoAnalysisResults = async () => {
  const transaction = await db.sequelize.transaction();

  try {
    console.log("===== SEED DEMO ANALYSIS RESULTS =====");

    const conversations = await db.Conversation.findAll({
      where: {
        audioUrl: {
          [Op.like]: "uploads/demo-audio-%",
        },
      },
      include: [
        {
          model: db.SpeakerAnalysisResult,
          as: "SpeakerAnalysisResult",
        },
        {
          model: db.VoiceToneResult,
          as: "voiceTone",
        },
      ],
      transaction,
    });

    if (!conversations.length) {
      throw new Error(
        "Không tìm thấy conversation demo. Hãy chạy các seeder trước: SpeakerAnalysisResult và VoiceToneResult.",
      );
    }

    for (const conversation of conversations) {
      const existed = await db.AnalysisResult.count({
        where: {
          conversationId: conversation.id,
        },
        transaction,
      });

      if (existed > 0) continue;

      const textResults = conversation.SpeakerAnalysisResult || [];
      const voiceResults = conversation.voiceTone || [];

      const staffText = textResults.find((item) => item.role === "staff");
      const customerText = textResults.find((item) => item.role === "customer");

      const staffVoice = voiceResults.find(
        (item) => item.speakerLabel === staffText?.speakerLabel,
      );

      const customerVoice = voiceResults.find(
        (item) => item.speakerLabel === customerText?.speakerLabel,
      );

      if (!staffText || !customerText || !staffVoice || !customerVoice) {
        console.log(
          `⚠️ Bỏ qua conversation ${conversation.id} vì thiếu text hoặc voice result`,
        );
        continue;
      }

      const staffScore = clamp(
        Number(staffText.score || 0.5) * 0.7 +
          Number(staffVoice.toneScore || 0.5) * 0.3,
      );

      const customerScore = clamp(
        Number(customerText.score || 0.5) * 0.7 +
          Number(customerVoice.toneScore || 0.5) * 0.3,
      );

      const finalScore = clamp(customerScore * 0.7 + staffScore * 0.3);

      const confidence = average([
        staffText.confidence,
        customerText.confidence,
        staffVoice.toneConfidence,
        customerVoice.toneConfidence,
      ]);

      await db.AnalysisResult.create(
        {
          conversationId: conversation.id,
          sentiment: getSentiment(finalScore),
          emotion: getEmotionByScore(finalScore),
          score: finalScore,
          confidence,
          customerScore,
          staffScore,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
        { transaction },
      );
    }

    await transaction.commit();

    console.log("✅ Tạo AnalysisResult demo thành công");
    process.exit(0);
  } catch (error) {
    await transaction.rollback();

    console.error("❌ Tạo AnalysisResult demo thất bại:", error);
    process.exit(1);
  }
};

seedDemoAnalysisResults();
