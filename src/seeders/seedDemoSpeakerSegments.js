import db from "../models/index.js";
import { Op } from "sequelize";

const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

const randomFloat = (min, max) =>
  Number((Math.random() * (max - min) + min).toFixed(2));

const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const clampScore = (score) =>
  Number(Math.max(0, Math.min(1, score)).toFixed(2));

const emotionByCase = {
  good: ["happy", "neutral", "surprised"],
  medium: ["neutral", "sad", "fearful"],
  bad: ["angry", "sad", "disgust", "fearful"],
};

const staffTexts = {
  good: [
    "Dạ em đã kiểm tra thông tin và trường hợp của anh chị có thể xử lý ngay.",
    "Em xin phép hướng dẫn từng bước để anh chị dễ thực hiện hơn.",
    "Dạ vấn đề này đã được ghi nhận và em sẽ hỗ trợ đến khi hoàn tất.",
    "Cảm ơn anh chị đã chờ, em đã tìm được hướng xử lý phù hợp.",
  ],
  medium: [
    "Dạ trường hợp này em cần kiểm tra thêm một chút để đảm bảo thông tin chính xác.",
    "Anh chị có thể cung cấp thêm mã đơn hoặc số điện thoại được không ạ?",
    "Hiện tại em ghi nhận vấn đề và sẽ chuyển sang bộ phận liên quan hỗ trợ tiếp.",
    "Dạ em hiểu vấn đề của anh chị, tuy nhiên cần thêm thời gian để xác minh.",
  ],
  bad: [
    "Dạ hiện tại em chưa thể xử lý ngay trường hợp này.",
    "Anh chị vui lòng thử lại sau hoặc chờ bộ phận khác phản hồi.",
    "Em chưa có đủ thông tin để đưa ra hướng giải quyết cụ thể.",
    "Trường hợp này có thể nằm ngoài phạm vi hỗ trợ trực tiếp của em.",
  ],
};

const customerTexts = {
  good: [
    "Cảm ơn bạn, cách hướng dẫn như vậy rất dễ hiểu.",
    "Tôi đã hiểu vấn đề rồi, như vậy là ổn.",
    "Bạn hỗ trợ khá nhanh, tôi hài lòng với cách xử lý này.",
    "Vậy tôi sẽ làm theo hướng dẫn của bạn.",
  ],
  medium: [
    "Tôi hiểu rồi nhưng vẫn hơi mất thời gian.",
    "Bạn giải thích thêm giúp tôi được không, tôi vẫn chưa chắc lắm.",
    "Tạm thời như vậy cũng được, nhưng tôi muốn được xử lý nhanh hơn.",
    "Tôi đã hỏi vấn đề này trước đó rồi nên mong được hỗ trợ rõ hơn.",
  ],
  bad: [
    "Tôi đã gọi nhiều lần nhưng vấn đề vẫn chưa được xử lý.",
    "Tôi không hài lòng với cách giải quyết này.",
    "Tôi thấy câu trả lời này chưa thỏa đáng.",
    "Tôi cần gặp người có thể xử lý rõ ràng hơn.",
  ],
};

const getDemoCase = () => {
  const cases = ["good", "good", "medium", "medium", "bad"];
  return randomItem(cases);
};

const getScoreByCase = (caseType) => {
  if (caseType === "good") return randomFloat(0.72, 0.95);
  if (caseType === "medium") return randomFloat(0.45, 0.68);
  return randomFloat(0.18, 0.42);
};

const buildToneDetail = (mainEmotion) => {
  const base = {
    angry: randomFloat(0.02, 0.12),
    disgust: randomFloat(0.02, 0.1),
    fearful: randomFloat(0.02, 0.12),
    happy: randomFloat(0.02, 0.14),
    neutral: randomFloat(0.12, 0.28),
    sad: randomFloat(0.02, 0.12),
    surprised: randomFloat(0.02, 0.1),
  };

  base[mainEmotion] = randomFloat(0.42, 0.72);

  return base;
};

const seedDemoSpeakerSegments = async () => {
  const transaction = await db.sequelize.transaction();

  try {
    console.log("===== SEED DEMO SPEAKER SEGMENTS =====");

    const conversations = await db.Conversation.findAll({
      where: {
        audioUrl: {
          [Op.like]: "uploads/demo-audio-%",
        },
      },
      transaction,
    });

    if (!conversations.length) {
      throw new Error(
        "Không tìm thấy conversation demo. Hãy chạy seedDemoConversations.js trước.",
      );
    }

    for (const conversation of conversations) {
      const existed = await db.SpeakerSegment.count({
        where: { conversationId: conversation.id },
        transaction,
      });

      if (existed > 0) continue;

      const caseType = getDemoCase();
      const segmentCount = randomInt(3, 5);

      let currentTime = 0;

      for (let i = 0; i < segmentCount; i++) {
        const isStaff = i % 2 === 0;

        const speaker = isStaff ? "SPEAKER_00" : "SPEAKER_01";
        const textSource = isStaff
          ? staffTexts[caseType]
          : customerTexts[caseType];

        const emotion = randomItem(emotionByCase[caseType]);
        const toneEmotion = randomItem(emotionByCase[caseType]);

        const emotionScore = getScoreByCase(caseType);
        const toneScore = clampScore(emotionScore + randomFloat(-0.12, 0.1));

        const startTime = currentTime;
        const endTime = currentTime + randomFloat(5, 14);

        currentTime = endTime + randomFloat(0.5, 2);

        await db.SpeakerSegment.create(
          {
            conversationId: conversation.id,
            speaker,
            startTime,
            endTime,
            text: randomItem(textSource),

            emotion,
            emotionScore,
            emotionConfidence: randomFloat(0.62, 0.92),

            toneEmotion,
            toneScore,
            toneConfidence: randomFloat(0.55, 0.9),
            toneDetail: buildToneDetail(toneEmotion),

            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt,
          },
          { transaction },
        );
      }
    }

    await transaction.commit();

    console.log("✅ Tạo SpeakerSegment demo thành công");
    process.exit(0);
  } catch (error) {
    await transaction.rollback();

    console.error("❌ Tạo SpeakerSegment demo thất bại:", error);
    process.exit(1);
  }
};

seedDemoSpeakerSegments();
