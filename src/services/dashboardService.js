import db from "../models/index.js";
import { Op, fn, col, literal, Sequelize } from "sequelize";
import { buildMonthRange, formatMonth } from "../utils/monthFilter.js";

/* =========================
   🔥 HELPER
========================= */
const buildDateFilter = (fromDate, toDate, month) => {
  if (month) {
    const { start, end } = buildMonthRange(month);

    return {
      [Op.between]: [start, end],
    };
  }

  if (fromDate && toDate) {
    return {
      [Op.between]: [new Date(fromDate), new Date(toDate)],
    };
  }

  if (fromDate) {
    return { [Op.gte]: new Date(fromDate) };
  }

  if (toDate) {
    return { [Op.lte]: new Date(toDate) };
  }

  const currentMonth = formatMonth(new Date());

  const { start, end } = buildMonthRange(currentMonth);

  return {
    [Op.between]: [start, end],
  };
};

const getTrendText = (value) => {
  if (value > 20) return "tăng mạnh";
  if (value > 5) return "tăng nhẹ";
  if (value < -20) return "giảm mạnh";
  if (value < -5) return "giảm nhẹ";
  return "ổn định";
};

const getSentimentDistributionByUserService = async (
  userId,
  fromDate,
  toDate,
  month,
) => {
  const dateFilter = buildDateFilter(fromDate, toDate, month);

  const result = await db.Conversation.findAll({
    attributes: [
      [fn("DATE", col("Conversation.createdAt")), "date"],

      // 🔥 tổng record
      [fn("COUNT", col("Conversation.id")), "totalRecords"],

      // 🔥 5 loại sentiment
      [
        Sequelize.literal(`
          SUM(CASE WHEN analysis.sentiment = 'very_negative' THEN 1 ELSE 0 END)
        `),
        "veryNegativeCount",
      ],
      [
        Sequelize.literal(`
          SUM(CASE WHEN analysis.sentiment = 'negative' THEN 1 ELSE 0 END)
        `),
        "negativeCount",
      ],
      [
        Sequelize.literal(`
          SUM(CASE WHEN analysis.sentiment = 'neutral' THEN 1 ELSE 0 END)
        `),
        "neutralCount",
      ],
      [
        Sequelize.literal(`
          SUM(CASE WHEN analysis.sentiment = 'positive' THEN 1 ELSE 0 END)
        `),
        "positiveCount",
      ],
      [
        Sequelize.literal(`
          SUM(CASE WHEN analysis.sentiment = 'very_positive' THEN 1 ELSE 0 END)
        `),
        "veryPositiveCount",
      ],
    ],
    include: [
      {
        model: db.AnalysisResult,
        as: "analysis",
        attributes: [],
      },
    ],
    where: {
      userId,
      ...(Object.keys(dateFilter).length && { createdAt: dateFilter }),
    },
    group: [fn("DATE", col("Conversation.createdAt"))],
    order: [[literal("date"), "ASC"]],
    raw: true,
  });

  // 🔥 chỉ normalize number, KHÔNG tính %
  return result.map((item) => ({
    date: item.date,
    totalRecords: Number(item.totalRecords || 0),

    veryNegativeCount: Number(item.veryNegativeCount || 0),
    negativeCount: Number(item.negativeCount || 0),
    neutralCount: Number(item.neutralCount || 0),
    positiveCount: Number(item.positiveCount || 0),
    veryPositiveCount: Number(item.veryPositiveCount || 0),
  }));
};

const getDashboardDailyService = async (userId, fromDate, toDate, month) => {
  const dateFilter = buildDateFilter(fromDate, toDate, month);

  const result = await db.Conversation.findAll({
    attributes: [
      [fn("DATE", col("Conversation.createdAt")), "date"],

      [fn("COUNT", col("Conversation.id")), "totalRecords"],

      [fn("AVG", col("analysis.score")), "avgScore"],

      [fn("AVG", col("analysis.customerScore")), "customerScore"],

      [
        Sequelize.literal(`
          SUM(CASE WHEN analysis.sentiment='very_negative' THEN 1 ELSE 0 END)
        `),
        "veryNegativeCount",
      ],
      [
        Sequelize.literal(`
          SUM(CASE WHEN analysis.sentiment='negative' THEN 1 ELSE 0 END)
        `),
        "negativeCount",
      ],
      [
        Sequelize.literal(`
          SUM(CASE WHEN analysis.sentiment='neutral' THEN 1 ELSE 0 END)
        `),
        "neutralCount",
      ],
      [
        Sequelize.literal(`
          SUM(CASE WHEN analysis.sentiment='positive' THEN 1 ELSE 0 END)
        `),
        "positiveCount",
      ],
      [
        Sequelize.literal(`
          SUM(CASE WHEN analysis.sentiment='very_positive' THEN 1 ELSE 0 END)
        `),
        "veryPositiveCount",
      ],
    ],

    include: [
      {
        model: db.AnalysisResult,
        as: "analysis",
        attributes: [],
      },
    ],

    where: {
      userId,
      ...(Object.keys(dateFilter).length && { createdAt: dateFilter }),
    },

    group: [fn("DATE", col("Conversation.createdAt"))],

    order: [[literal("date"), "ASC"]],

    raw: true,
  });

  return result.map((item) => ({
    ...item,
    totalRecords: Number(item.totalRecords || 0),
    avgScore: Number(item.avgScore || 0),
    customerScore: Number(item.customerScore || 0),

    veryNegativeCount: Number(item.veryNegativeCount || 0),
    negativeCount: Number(item.negativeCount || 0),
    neutralCount: Number(item.neutralCount || 0),
    positiveCount: Number(item.positiveCount || 0),
    veryPositiveCount: Number(item.veryPositiveCount || 0),
  }));
};

const getMonthlyKpiService = async (userId, month) => {
  // const now = new Date();

  // // 🔥 tháng hiện tại
  // const startCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  // const endCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // // 🔥 tháng trước
  // const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  // const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  // 🔥 tháng đang xem
  const selectedMonth = month || formatMonth(new Date());

  const { start: startCurrentMonth, end: endCurrentMonth } =
    buildMonthRange(selectedMonth);

  // 🔥 tháng trước
  const currentDate = new Date(startCurrentMonth);

  currentDate.setMonth(currentDate.getMonth() - 1);

  const lastMonth = formatMonth(currentDate);

  const { start: startLastMonth, end: endLastMonth } =
    buildMonthRange(lastMonth);

  /* =========================
     🔥 CURRENT MONTH
  ========================= */
  const currentData = await db.Conversation.findAll({
    attributes: [
      [fn("COUNT", col("Conversation.id")), "totalRecords"],
      [fn("AVG", col("analysis.score")), "avgScore"],
    ],
    include: [
      {
        model: db.AnalysisResult,
        as: "analysis",
        attributes: [],
      },
    ],
    where: {
      userId,
      createdAt: {
        [Op.between]: [startCurrentMonth, endCurrentMonth],
      },
    },
    raw: true,
  });

  /* =========================
     🔥 LAST MONTH
  ========================= */
  const lastData = await db.Conversation.findAll({
    attributes: [[fn("COUNT", col("Conversation.id")), "totalRecords"]],
    where: {
      userId,
      createdAt: {
        [Op.between]: [startLastMonth, endLastMonth],
      },
    },
    raw: true,
  });

  /* =========================
     🔥 BEST / WORST DAY
  ========================= */
  const dailyScore = await db.Conversation.findAll({
    attributes: [
      [fn("DATE", col("Conversation.createdAt")), "date"],
      [fn("AVG", col("analysis.score")), "avgScore"],
    ],
    include: [
      {
        model: db.AnalysisResult,
        as: "analysis",
        attributes: [],
      },
    ],
    where: {
      userId,
      createdAt: {
        [Op.between]: [startCurrentMonth, endCurrentMonth],
      },
    },
    group: [fn("DATE", col("Conversation.createdAt"))],
    raw: true,
  });

  let bestDay = null;
  let worstDay = null;

  if (dailyScore.length) {
    const sorted = [...dailyScore].sort((a, b) => b.avgScore - a.avgScore);

    bestDay = sorted[0];
    worstDay = sorted[sorted.length - 1];
  }

  /* =========================
     🔥 CALCULATE
  ========================= */
  const currentTotal = Number(currentData[0]?.totalRecords || 0);
  const lastTotal = Number(lastData[0]?.totalRecords || 0);
  const avgScore = Number(currentData[0]?.avgScore || 0);

  const growth =
    lastTotal === 0 ? 100 : ((currentTotal - lastTotal) / lastTotal) * 100;

  return {
    totalRecords: currentTotal,
    growth: Number(growth.toFixed(1)),
    avgScore: Number(avgScore.toFixed(2)),
    bestDay,
    worstDay,
  };
};

const getInsightService = async (userId, month) => {
  const insights = [];

  /* =========================
     🔥 1. KPI (audio + score)
  ========================= */
  const kpi = await getMonthlyKpiService(userId, month);

  const growthText = getTrendText(kpi.growth);

  // 👉 insight số lượng audio
  insights.push({
    type: kpi.growth < 0 ? "warning" : "good",
    message: `Số lượng cuộc hội thoại ${growthText} (${kpi.growth}%) so với tháng trước`,
  });

  // 👉 insight điểm trung bình
  if (kpi.avgScore < 0.4) {
    insights.push({
      type: "danger",
      message:
        "Điểm trung bình của bạn đang thấp, cần cải thiện! Hãy xem lại các cuộc hội thoại gần đây để tìm ra vấn đề và cải thiện chất lượng phục vụ khách hàng.",
    });
  } else if (kpi.avgScore < 0.6) {
    insights.push({
      type: "warning",
      message: "Điểm trung bình ở mức trung bình, có thể cải thiện thêm",
    });
  } else {
    insights.push({
      type: "good",
      message: "Bạn đang giữ được chất lượng hội thoại tốt 👍",
    });
  }

  /* =========================
     🔥 2. TOP VẤN ĐỀ
  ========================= */
  // const sentimentData = await getSentimentDistributionByUserService(userId);

  const result = await db.AnalysisResult.findAll({
    attributes: [
      [fn("COUNT", col("AnalysisResult.id")), "total"],
      [
        Sequelize.literal(`
        SUM(CASE WHEN sentiment IN ('negative','very_negative') THEN 1 ELSE 0 END)
      `),
        "negative",
      ],
      [
        Sequelize.literal(`
        SUM(CASE WHEN AnalysisResult.sentiment IN ('positive','very_positive') THEN 1 ELSE 0 END)
      `),
        "positive",
      ],
    ],
    include: [
      {
        model: db.Conversation,
        as: "conversation",
        attributes: [],
        where: { userId },
      },
    ],
    raw: true,
  });

  // let totalNegative = 0;
  // let total = 0;
  // // sentimentData.forEach((day) => {
  // //   totalNegative += day.veryNegativeCount + day.negativeCount;
  // //   total += day.totalRecords;
  // // });

  const total = Number(result[0]?.total || 0);
  const totalNegative = Number(result[0]?.negative || 0);
  const totalPositive = Number(result[0]?.positive || 0);
  const negativeRate = total ? totalNegative / total : 0;
  const positiveRate = total ? totalPositive / total : 0;

  if (negativeRate > 0.4) {
    insights.push({
      type: "danger",
      message: `Tỷ lệ khách hàng tiêu cực cao (${Math.round(
        negativeRate * 100,
      )}%), đây là vấn đề lớn nhất cần cải thiện`,
    });
  } else if (negativeRate > 0.25) {
    insights.push({
      type: "warning",
      message: `Khách hàng có xu hướng tiêu cực (${Math.round(
        negativeRate * 100,
      )}%), cần chú ý`,
    });
  } else {
    insights.push({
      type: "good",
      message: "Khách hàng đang có trải nghiệm tích cực 👍",
    });
  }
  if (positiveRate > 0.7) {
    insights.push({
      type: "good",
      message: `Tỷ lệ khách hàng hài lòng rất cao (${Math.round(
        positiveRate * 100,
      )}%), bạn đang làm rất tốt 👍`,
    });
  } else if (positiveRate > 0.5) {
    insights.push({
      type: "good",
      message: `Khách hàng nhìn chung hài lòng (${Math.round(
        positiveRate * 100,
      )}%), tiếp tục phát huy`,
    });
  } else if (positiveRate > 0.3) {
    insights.push({
      type: "warning",
      message: `Tỷ lệ hài lòng chưa cao (${Math.round(
        positiveRate * 100,
      )}%), cần cải thiện thêm trải nghiệm`,
    });
  } else {
    insights.push({
      type: "danger",
      message: `Khách hàng chưa hài lòng (${Math.round(
        positiveRate * 100,
      )}%), cần xem lại`,
    });
  }

  /* =========================
     🔥 LIMIT (max 3–4 cái thôi)
  ========================= */
  return insights.slice(0, 4);
};

//==================ADMIN=========================

const recalcUserMonthlyStats = async (userId, conversationDate) => {
  const now = new Date();

  // const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // const start = new Date(now.getFullYear(), now.getMonth(), 1);
  // const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const month = formatMonth(new Date(conversationDate));
  const { start, end } = buildMonthRange(month);

  const result = await db.Conversation.findAll({
    attributes: [
      [fn("COUNT", col("Conversation.id")), "total"],
      [fn("SUM", col("analysis.score")), "totalScore"],
      [fn("AVG", col("analysis.score")), "avgScore"],
      [
        Sequelize.literal(`
          SUM(CASE WHEN analysis.score <= 0.4 THEN 1 ELSE 0 END)
        `),
        "negativeCount",
      ],
    ],
    include: [
      {
        model: db.AnalysisResult,
        as: "analysis",
        attributes: [],
      },
    ],
    where: {
      userId,
      createdAt: {
        [Op.between]: [start, end],
      },
    },
    raw: true,
  });

  const data = result[0] || {};

  const speakerStats = await db.Conversation.findAll({
    attributes: [
      [fn("AVG", col("analysis.customerScore")), "customerAvg"],
      [fn("AVG", col("analysis.staffScore")), "staffAvg"],
    ],

    include: [
      {
        model: db.AnalysisResult,
        as: "analysis",
        attributes: [],
      },
    ],

    where: {
      userId,
      createdAt: {
        [Op.between]: [start, end],
      },
    },

    raw: true,
  });

  const speaker = speakerStats[0] || {};

  await db.UserMonthlyStats.upsert({
    userId,
    month,
    totalConversations: Number(data.total || 0),
    totalScore: Number(data.totalScore || 0),
    avgScore: Number(data.avgScore || 0),
    negativeCount: Number(data.negativeCount || 0),
    customer: Number(speaker.customerAvg || 0),
    staff: Number(speaker.staffAvg || 0),
  });
};

const getAdminDashboardService = async ({ sortBy, order, month }) => {
  const now = new Date();

  const defaultMonth = `${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}`;

  month = month || defaultMonth;
  order = order?.toUpperCase() === "ASC" ? "ASC" : "DESC";

  const validSortFields = ["totalConversations", "avgScore", "negativeCount"];

  if (!validSortFields.includes(sortBy)) {
    sortBy = "totalConversations";
  }

  const totalSystem = await db.UserMonthlyStats.findAll({
    where: { month },
    attributes: [
      [Sequelize.fn("SUM", Sequelize.col("totalConversations")), "totalAudio"],
      [Sequelize.fn("AVG", Sequelize.col("avgScore")), "avgScore"],
      [Sequelize.fn("SUM", Sequelize.col("negativeCount")), "totalNegative"],
    ],
    raw: true,
  });

  const totalAudio = Number(totalSystem[0]?.totalAudio || 0);

  const totalNegative = Number(totalSystem[0]?.totalNegative || 0);

  const negativeRate =
    totalAudio > 0 ? Number((totalNegative / totalAudio).toFixed(4)) : 0;

  const topAudio = await db.UserMonthlyStats.findAll({
    where: { month },
    order: [["totalConversations", "DESC"]],
    limit: 5,
    include: [
      {
        model: db.User,
        attributes: ["id", "fullName", "email"],
      },
    ],
  });

  const topScore = await db.UserMonthlyStats.findAll({
    where: { month },
    order: [["avgScore", "DESC"]],
    limit: 5,
    include: [
      {
        model: db.User,
        attributes: ["id", "fullName", "email"],
      },
    ],
  });

  const topNegative = await db.UserMonthlyStats.findAll({
    where: { month },
    order: [["negativeCount", "DESC"]],
    limit: 5,
    include: [
      {
        model: db.User,
        attributes: ["id", "fullName", "email"],
      },
    ],
  });

  const users = await db.UserMonthlyStats.findAll({
    where: { month },
    include: [
      {
        model: db.User,
        attributes: ["id", "fullName", "email", "image"],
      },
    ],
    order: [
      [sortBy, order],
      ["avgScore", "DESC"],
    ],
  });

  const formattedUsers = users.map((u) => {
    const total = u.totalConversations || 0;
    const negative = u.negativeCount || 0;

    return {
      userId: u.userId,
      fullName: u.User?.fullName,
      email: u.User?.email,
      image: u.User?.image,
      totalConversations: total,
      avgScore: Number(u.avgScore || 0).toFixed(2),

      negativeCount: negative,
      negativeRate: total ? (negative / total).toFixed(4) : 0,
    };
  });

  return {
    filter: {
      month,
      sortBy,
      order,
    },

    totalSystem: {
      totalAudio,
      avgScore: Number(totalSystem[0]?.avgScore || 0).toFixed(2),
      totalNegative,
      negativeRate,
    },

    top: {
      topAudio,
      topScore,
      topNegative,
    },

    users: formattedUsers,
  };
};

const getAdminUserDetailService = async (userId, month) => {
  /* =========================
     🔥 1. KPI USER
  ========================= */
  const userStats = await db.UserMonthlyStats.findOne({
    where: { userId, month },
    include: [
      {
        model: db.User,
        attributes: ["id", "fullName", "email", "image"],
      },
    ],
  });

  if (!userStats) {
    return { errCode: 1, message: "User stats not found" };
  }

  /* =========================
     🔥 2. KPI SYSTEM
  ========================= */
  const systemStats = await db.UserMonthlyStats.findAll({
    where: { month },
    attributes: [
      [fn("SUM", col("totalConversations")), "totalAudio"],
      [fn("AVG", col("avgScore")), "avgScore"],
      [fn("SUM", col("negativeCount")), "totalNegative"],
    ],
    raw: true,
  });

  const sys = systemStats[0] || {};

  const systemAvgScore = Number(sys.avgScore || 0);
  const systemNegativeRate =
    sys.totalAudio > 0 ? sys.totalNegative / sys.totalAudio : 0;

  /* =========================
     🔥 3. COMPARISON
  ========================= */
  const userNegativeRate =
    userStats.totalConversations > 0
      ? userStats.negativeCount / userStats.totalConversations
      : 0;

  const comparison = {
    scoreDiff: Number((userStats.avgScore - systemAvgScore).toFixed(2)),
    negativeDiff: Number((userNegativeRate - systemNegativeRate).toFixed(4)),
  };

  /* =========================
     🔥 4. CHART (FIX: dùng final score)
  ========================= */
  // const start = new Date(`${month}-01`);
  // const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  const { start, end } = buildMonthRange(month);

  const dailyUser = await db.Conversation.findAll({
    attributes: [
      [fn("DATE", col("Conversation.createdAt")), "date"],
      [fn("AVG", col("analysis.customerScore")), "userScore"], // 🔥 FIX
    ],
    include: [
      {
        model: db.AnalysisResult,
        as: "analysis",
        attributes: [],
      },
    ],
    where: {
      userId,
      createdAt: { [Op.between]: [start, end] },
    },
    group: [fn("DATE", col("Conversation.createdAt"))],
    raw: true,
  });

  const dailySystem = await db.Conversation.findAll({
    attributes: [
      [fn("DATE", col("Conversation.createdAt")), "date"],
      [fn("AVG", col("analysis.customerScore")), "systemScore"], // 🔥 FIX
    ],
    include: [
      {
        model: db.AnalysisResult,
        as: "analysis",
        attributes: [],
      },
    ],
    where: {
      createdAt: { [Op.between]: [start, end] },
    },
    group: [fn("DATE", col("Conversation.createdAt"))],
    raw: true,
  });

  const chartMap = {};

  dailySystem.forEach((item) => {
    chartMap[item.date] = {
      date: item.date,
      systemScore: Number(item.systemScore || 0),
      userScore: 0,
    };
  });

  dailyUser.forEach((item) => {
    if (!chartMap[item.date]) {
      chartMap[item.date] = {
        date: item.date,
        systemScore: 0,
        userScore: 0,
      };
    }

    chartMap[item.date].userScore = Number(item.userScore || 0);
  });

  const chart = Object.values(chartMap).sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );

  /* =========================
     🔥 5. ROLE ANALYSIS (FIX)
  ========================= */
  // 👉 KHÔNG dùng SpeakerAnalysisResult nữa
  // 👉 lấy trực tiếp từ AnalysisResult

  // const roleData = await db.Conversation.findAll({
  //   attributes: [
  //     [fn("AVG", col("analysis.customerScore")), "customerAvgScore"],
  //     [fn("AVG", col("analysis.staffScore")), "staffAvgScore"],
  //   ],
  //   include: [
  //     {
  //       model: db.AnalysisResult,
  //       as: "analysis",
  //       attributes: [],
  //     },
  //   ],
  //   where: {
  //     userId,
  //     createdAt: { [Op.between]: [start, end] },
  //   },
  //   raw: true,
  // });

  // const role = roleData[0] || {};

  // const speaker = [
  //   {
  //     role: "customer",
  //     avgScore: Number(Number(role.customerAvgScore || 0).toFixed(2)),
  //   },
  //   {
  //     role: "staff",
  //     avgScore: Number(Number(role.staffAvgScore || 0).toFixed(2)),
  //   },
  // ];

  const speaker = [
    {
      role: "customer",
      avgScore: Number(userStats.customer || 0),
    },
    {
      role: "staff",
      avgScore: Number(userStats.staff || 0),
    },
  ];

  /* =========================
     RETURN
  ========================= */
  return {
    errCode: 0,
    data: {
      kpi: {
        totalAudio: userStats.totalConversations,
        avgScore: Number(userStats.avgScore.toFixed(2)),
        negativeRate: Number(userNegativeRate.toFixed(4)),
      },

      comparison,
      chart,
      speaker,
      user: userStats.User,
    },
  };
};

export {
  getSentimentDistributionByUserService,
  getDashboardDailyService,
  getMonthlyKpiService,
  getInsightService,
  //==================ADMIN=========================
  recalcUserMonthlyStats,
  getAdminDashboardService,
  getAdminUserDetailService,
};
