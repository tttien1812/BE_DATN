import db from "../models/index.js";
import { Op } from "sequelize";
import { recalcUserMonthlyStats } from "../services/dashboardService.js";

const getMonthKey = (date) => {
  const d = new Date(date);

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const recalcDemoMonthlyStats = async () => {
  try {
    console.log("===== RECALC DEMO MONTHLY STATS =====");

    const demoUsers = await db.User.findAll({
      where: {
        email: {
          [Op.like]: "%.demo@voxsence.com",
        },
      },
    });

    if (!demoUsers.length) {
      throw new Error("Không tìm thấy user demo.");
    }

    for (const user of demoUsers) {
      const conversations = await db.Conversation.findAll({
        where: {
          userId: user.id,
          audioUrl: {
            [Op.like]: "uploads/demo-audio-%",
          },
        },
        include: [
          {
            model: db.AnalysisResult,
            as: "analysis",
            attributes: ["id"],
            required: true,
          },
        ],
        attributes: ["id", "createdAt"],
        order: [["createdAt", "ASC"]],
      });

      const monthMap = new Map();

      for (const conversation of conversations) {
        const month = getMonthKey(conversation.createdAt);

        if (!monthMap.has(month)) {
          monthMap.set(month, conversation.createdAt);
        }
      }

      for (const [month, date] of monthMap.entries()) {
        await recalcUserMonthlyStats(user.id, date);

        console.log(
          `✅ Recalc user=${user.fullName} | id=${user.id} | month=${month}`,
        );
      }
    }

    console.log("===== DONE RECALC DEMO MONTHLY STATS =====");
    process.exit(0);
  } catch (error) {
    console.error("❌ Recalc demo monthly stats failed:", error);
    process.exit(1);
  }
};

recalcDemoMonthlyStats();
