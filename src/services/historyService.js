import db from "../models/index.js";
import { fn, col, Op } from "sequelize";

const getHistoryDaysService = async (userId) => {
  try {
    const days = await db.Conversation.findAll({
      where: { userId },
      attributes: [[fn("DATE", col("createdAt")), "date"]],
      group: [fn("DATE", col("createdAt"))],
      order: [[fn("DATE", col("createdAt")), "DESC"]],
      raw: true,
    });

    return {
      errCode: 0,
      data: days.map((item) => item.date),
    };
  } catch (error) {
    console.error(error);
    return { errCode: 1 };
  }
};

const getHistoryByDateService = async (userId, date) => {
  try {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const conversations = await db.Conversation.findAll({
      where: {
        userId,
        createdAt: {
          [Op.between]: [start, end],
        },
      },
      attributes: ["id", "audioUrl", "status", "createdAt", "updatedAt"],
      include: [
        {
          model: db.AnalysisResult,
          as: "analysis",
          attributes: [
            "sentiment",
            "emotion",
            "score",
            "confidence",
            "customerScore",
            "staffScore",
          ],
        },
        {
          model: db.SpeakerAnalysisResult,
          as: "SpeakerAnalysisResult",
          attributes: [
            "speakerLabel",
            "role",
            "sentiment",
            "emotion",
            "score",
            "confidence",
          ],
        },
        {
          model: db.VoiceToneResult,
          as: "voiceTone",
          attributes: [
            "speakerLabel",
            "toneEmotion",
            "toneScore",
            "toneSentiment",
            "toneConfidence",
          ],
        },
        {
          model: db.SpeakerSegment,
          as: "segments",
          attributes: ["startTime", "endTime", "text"],
        },

        // {
        //   model: db.Transcript,
        //   as: "transcript",
        //   attributes: ["content"],
        // },
      ],

      order: [["createdAt", "DESC"]],
    });

    const formattedData = conversations.map((item) => {
      const json = item.toJSON();

      const validSegments = (json.segments || []).filter((segment) =>
        segment.text?.trim(),
      );

      const duration =
        validSegments.length > 0
          ? Math.max(...validSegments.map((s) => s.endTime || 0))
          : 0;

      if (json.analysis) {
        json.analysis.score = Number((json.analysis.score || 0).toFixed(2));

        json.analysis.confidence = Number(
          (json.analysis.confidence || 0).toFixed(2),
        );

        json.analysis.customerScore = Number(
          (json.analysis.customerScore || 0).toFixed(2),
        );

        json.analysis.staffScore = Number(
          (json.analysis.staffScore || 0).toFixed(2),
        );
      }

      if (json.voiceTone?.length) {
        json.voiceTone = json.voiceTone.map((tone) => ({
          ...tone,
          toneScore: Number((tone.toneScore || 0).toFixed(2)),
          toneConfidence: Number((tone.toneConfidence || 0).toFixed(2)),
        }));
      }

      return {
        ...json,
        duration,
        segments: undefined,
      };
    });

    return {
      errCode: 0,
      data: formattedData,
    };
  } catch (error) {
    console.error(error);
    return { errCode: 1 };
  }
};

const getHistoryDetailService = async (conversationId) => {
  try {
    const data = await db.Conversation.findOne({
      where: { id: conversationId },
      attributes: ["id", "audioUrl", "status", "createdAt", "updatedAt"],
      include: [
        // {
        //   model: db.Transcript,
        //   as: "transcript",
        //   attributes: ["content"],
        // },
        {
          model: db.AnalysisResult,
          as: "analysis",
          attributes: [
            "sentiment",
            "emotion",
            "score",
            "confidence",
            "customerScore",
            "staffScore",
            "createdAt",
          ],
        },
        {
          model: db.SpeakerAnalysisResult,
          as: "SpeakerAnalysisResult",
          attributes: [
            "speakerLabel",
            "role",
            "sentiment",
            "emotion",
            "score",
            "confidence",
          ],
        },
        {
          model: db.VoiceToneResult,
          as: "voiceTone",
          attributes: [
            "speakerLabel",
            "toneEmotion",
            "toneScore",
            "toneSentiment",
            "toneConfidence",
          ],
        },
        {
          model: db.SpeakerSegment,
          as: "segments",
          attributes: [
            "id",
            "speaker",
            "startTime",
            "endTime",
            "text",
            "createdAt",
          ],

          order: [["startTime", "ASC"]],
        },
      ],

      order: [
        [{ model: db.SpeakerSegment, as: "segments" }, "startTime", "ASC"],
      ],
    });

    if (!data) {
      return { errCode: 1, errMessage: "Not found" };
    }

    return {
      errCode: 0,
      data,
    };
  } catch (error) {
    console.error(error);
    return { errCode: 1 };
  }
};

export {
  getHistoryDaysService,
  getHistoryByDateService,
  getHistoryDetailService,
};
