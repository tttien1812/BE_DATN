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

    const data = await db.Conversation.findAll({
      where: {
        userId,
        createdAt: {
          [Op.between]: [start, end],
        },
      },
      attributes: ["id", "createdAt", "audioUrl"],
      include: [
        {
          model: db.AnalysisResult,
          as: "analysis",
          attributes: ["emotion", "sentiment"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return {
      errCode: 0,
      data,
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
      include: [
        {
          model: db.Transcript,
          as: "transcript",
          attributes: ["content"],
        },
        {
          model: db.AnalysisResult,
          as: "analysis",
          attributes: ["emotion", "sentiment"],
        },
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
