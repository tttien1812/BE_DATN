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

const toPercent = (value) => `${Math.round((Number(value) || 0) * 100)}%`;

const makeInsight = ({
  scope,
  group,
  type,
  title,
  metric,
  message,
  action,
}) => ({
  scope,
  group,
  type,
  title,
  metric,
  message,
  action,
});

const formatScore = (value) => {
  return Number(value || 0).toFixed(2);
};

const getReliabilityType = (avgConfidence, lowConfidenceRate) => {
  if (avgConfidence < 0.55 || lowConfidenceRate >= 0.3) {
    return "danger";
  }

  if (avgConfidence < 0.7 || lowConfidenceRate >= 0.15) {
    return "warning";
  }

  return "good";
};

const getReliabilityTitle = (type, scope = "user") => {
  if (scope === "admin") {
    if (type === "danger") return "Độ tin cậy AI toàn hệ thống thấp";
    if (type === "warning") return "Độ tin cậy AI toàn hệ thống cần theo dõi";
    return "Độ tin cậy AI toàn hệ thống ổn định";
  }

  if (type === "danger") return "Độ tin cậy AI đang thấp";
  if (type === "warning") return "Độ tin cậy AI cần theo dõi";
  return "Độ tin cậy AI ổn định";
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

const getUserInsightService = async (userId, month) => {
  const insights = [];

  const selectedMonth = month || formatMonth(new Date());
  const { start, end } = buildMonthRange(selectedMonth);

  const kpi = await getMonthlyKpiService(userId, selectedMonth);

  const summary = await db.Conversation.findAll({
    attributes: [
      [fn("COUNT", col("Conversation.id")), "total"],
      [fn("AVG", col("analysis.score")), "avgScore"],
      [fn("AVG", col("analysis.customerScore")), "avgCustomerScore"],
      [fn("AVG", col("analysis.staffScore")), "avgStaffScore"],
      [fn("AVG", col("analysis.confidence")), "avgConfidence"],
      [
        Sequelize.literal(`
          SUM(CASE WHEN analysis.score < 0.4 THEN 1 ELSE 0 END)
        `),
        "lowScoreCount",
      ],
      [
        Sequelize.literal(`
          SUM(CASE WHEN analysis.customerScore < 0.4 THEN 1 ELSE 0 END)
        `),
        "lowCustomerCount",
      ],
      [
        Sequelize.literal(`
          SUM(CASE WHEN analysis.staffScore < 0.4 THEN 1 ELSE 0 END)
        `),
        "lowStaffCount",
      ],
      [
        Sequelize.literal(`
          SUM(CASE WHEN analysis.confidence < 0.6 THEN 1 ELSE 0 END)
        `),
        "lowConfidenceCount",
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
      createdAt: { [Op.between]: [start, end] },
    },
    raw: true,
  });

  const data = summary[0] || {};

  const total = Number(data.total || 0);
  const avgScore = Number(data.avgScore || 0);
  const avgCustomerScore = Number(data.avgCustomerScore || 0);
  const avgStaffScore = Number(data.avgStaffScore || 0);
  const lowScoreRate = total ? Number(data.lowScoreCount || 0) / total : 0;
  const lowCustomerRate = total
    ? Number(data.lowCustomerCount || 0) / total
    : 0;
  const lowStaffRate = total ? Number(data.lowStaffCount || 0) / total : 0;
  const avgConfidence = Number(data.avgConfidence || 0);
  const lowConfidenceCount = Number(data.lowConfidenceCount || 0);
  const lowConfidenceRate = total ? lowConfidenceCount / total : 0;

  const voiceSummary = await db.VoiceToneResult.findAll({
    attributes: [
      [fn("COUNT", col("VoiceToneResult.id")), "totalTone"],
      [
        Sequelize.literal(`
          SUM(CASE WHEN toneScore < 0.35 AND toneConfidence >= 0.6 THEN 1 ELSE 0 END)
        `),
        "negativeToneCount",
      ],
    ],
    include: [
      {
        model: db.Conversation,
        as: "conversation",
        attributes: [],
        where: {
          userId,
          createdAt: { [Op.between]: [start, end] },
        },
      },
    ],
    raw: true,
  });

  const toneTotal = Number(voiceSummary[0]?.totalTone || 0);
  const negativeToneCount = Number(voiceSummary[0]?.negativeToneCount || 0);
  const negativeToneRate = toneTotal ? negativeToneCount / toneTotal : 0;

  // 1. PERFORMANCE
  if (avgScore < 0.4) {
    insights.push(
      makeInsight({
        scope: "user",
        group: "performance",
        type: "danger",
        title: "Chất lượng cuộc gọi đang giảm",
        metric: formatScore(avgScore),
        message:
          "Kết quả các cuộc gọi trong tháng chưa đạt kỳ vọng và có dấu hiệu ảnh hưởng đến trải nghiệm khách hàng.",
        action:
          "Xem lại những cuộc gọi có kết quả thấp để tìm nguyên nhân và rút kinh nghiệm cho các cuộc gọi tiếp theo.",
      }),
    );
  } else if (avgScore < 0.6) {
    insights.push(
      makeInsight({
        scope: "user",
        group: "performance",
        type: "warning",
        title: "Hiệu quả cuộc gọi cần cải thiện",
        metric: formatScore(avgScore),
        message:
          "Kết quả làm việc đang ở mức trung bình. Một số cuộc gọi vẫn còn cơ hội để nâng cao chất lượng tư vấn và hỗ trợ khách hàng.",
        action:
          "So sánh các cuộc gọi có kết quả tốt và chưa tốt để tìm ra điểm cần cải thiện.",
      }),
    );
  } else {
    insights.push(
      makeInsight({
        scope: "user",
        group: "performance",
        type: "good",
        title: "Chất lượng cuộc gọi ổn định",
        metric: formatScore(avgScore),
        message:
          "Kết quả các cuộc gọi trong tháng đang duy trì ở mức tốt và tương đối ổn định.",
        action: "Tiếp tục duy trì cách trao đổi và xử lý khách hàng hiện tại.",
      }),
    );
  }

  // 2. CUSTOMER EXPERIENCE
  if (avgCustomerScore < 0.4 || lowCustomerRate >= 0.3) {
    insights.push(
      makeInsight({
        scope: "user",
        group: "customer",
        type: "danger",
        title: "Khách hàng đang có nhiều phản hồi chưa tích cực",
        metric: toPercent(lowCustomerRate),
        message:
          "Một số cuộc gọi cho thấy khách hàng chưa thực sự hài lòng hoặc vẫn còn băn khoăn sau khi trao đổi.",
        action:
          "Nghe lại các cuộc gọi có phản hồi chưa tích cực để xác định thời điểm khách hàng bắt đầu mất thiện cảm.",
      }),
    );
  } else if (avgCustomerScore < 0.6 || lowCustomerRate >= 0.15) {
    insights.push(
      makeInsight({
        scope: "user",
        group: "customer",
        type: "warning",
        title: "Trải nghiệm khách hàng cần được cải thiện",
        metric: formatScore(avgCustomerScore),
        message:
          "Nhìn chung khách hàng vẫn có phản hồi tích cực, tuy nhiên vẫn xuất hiện một số cuộc gọi chưa đạt chất lượng mong muốn.",
        action:
          "Theo dõi các cuộc gọi có dấu hiệu khách hàng chưa hài lòng để kịp thời điều chỉnh cách trao đổi.",
      }),
    );
  } else {
    insights.push(
      makeInsight({
        scope: "user",
        group: "customer",
        type: "good",
        title: "Khách hàng nhìn chung hài lòng",
        metric: formatScore(avgCustomerScore),
        message:
          "Phần lớn các cuộc gọi trong tháng cho thấy khách hàng có trải nghiệm tích cực khi trao đổi.",
        action: "Tiếp tục duy trì cách hỗ trợ và chăm sóc khách hàng hiện tại.",
      }),
    );
  }

  // 3. STAFF QUALITY
  if (avgStaffScore < 0.4 || lowStaffRate >= 0.3) {
    insights.push(
      makeInsight({
        scope: "user",
        group: "staff",
        type: "danger",
        title: "Kỹ năng xử lý cuộc gọi cần được cải thiện",
        metric: formatScore(avgStaffScore),
        message:
          "Một số cuộc gọi cho thấy quá trình tư vấn hoặc hỗ trợ khách hàng chưa thực sự hiệu quả.",
        action:
          "Xem lại các cuộc gọi có kết quả thấp để nhận diện những tình huống cần cải thiện trong quá trình trao đổi.",
      }),
    );
  } else if (avgStaffScore < 0.6 || lowStaffRate >= 0.15) {
    insights.push(
      makeInsight({
        scope: "user",
        group: "staff",
        type: "warning",
        title: "Chất lượng xử lý cuộc gọi ở mức trung bình",
        metric: formatScore(avgStaffScore),
        message:
          "Kỹ năng trao đổi với khách hàng đang ở mức chấp nhận được nhưng vẫn còn nhiều cơ hội để nâng cao hiệu quả.",
        action:
          "Chú ý các cuộc gọi có kết quả thấp để cải thiện cách phản hồi và xử lý tình huống.",
      }),
    );
  } else {
    insights.push(
      makeInsight({
        scope: "user",
        group: "staff",
        type: "good",
        title: "Kỹ năng xử lý cuộc gọi đang phát huy tốt",
        metric: formatScore(avgStaffScore),
        message:
          "Khả năng tư vấn và hỗ trợ khách hàng đang được duy trì ổn định trong phần lớn các cuộc gọi.",
        action: "Tiếp tục phát huy những cách xử lý hiệu quả đang áp dụng.",
      }),
    );
  }

  // 4. RISK
  const riskRate = Math.max(negativeToneRate, lowScoreRate);

  if (negativeToneRate >= 0.3 || lowScoreRate >= 0.25) {
    insights.push(
      makeInsight({
        scope: "user",
        group: "risk",
        type: "danger",
        title: "Xuất hiện nhiều cuộc gọi cần chú ý",
        metric: toPercent(riskRate),
        message:
          "Hệ thống ghi nhận nhiều cuộc gọi có dấu hiệu căng thẳng hoặc kết quả chưa đạt kỳ vọng.",
        action:
          "Ưu tiên xem lại các cuộc gọi được đánh dấu cảnh báo để xác định nguyên nhân.",
      }),
    );
  } else if (negativeToneRate >= 0.15 || lowScoreRate >= 0.15) {
    insights.push(
      makeInsight({
        scope: "user",
        group: "risk",
        type: "warning",
        title: "Có một số cuộc gọi cần theo dõi",
        metric: toPercent(riskRate),
        message:
          "Một số cuộc gọi xuất hiện dấu hiệu khách hàng chưa hài lòng hoặc cuộc trao đổi chưa diễn ra thuận lợi.",
        action:
          "Kiểm tra các cuộc gọi được hệ thống cảnh báo để chủ động cải thiện chất lượng.",
      }),
    );
  } else {
    insights.push(
      makeInsight({
        scope: "user",
        group: "risk",
        type: "good",
        title: "Chưa phát hiện rủi ro đáng chú ý",
        metric: `${negativeToneCount} tín hiệu`,
        message:
          "Phần lớn các cuộc gọi trong tháng diễn ra ổn định và chưa xuất hiện nhiều dấu hiệu bất thường.",
        action: "Tiếp tục duy trì chất lượng ở các cuộc gọi tiếp theo.",
      }),
    );
  }

  /* =========================
   5. AI RELIABILITY
========================= */
  const reliabilityType = getReliabilityType(avgConfidence, lowConfidenceRate);

  insights.push(
    makeInsight({
      scope: "user",
      group: "reliability",
      type: reliabilityType,
      title: getReliabilityTitle(reliabilityType, "user"),
      metric: toPercent(avgConfidence),
      message:
        reliabilityType === "danger"
          ? `Trong ${total} cuộc gọi được phân tích, có ${lowConfidenceCount} cuộc gọi mà hệ thống chưa đủ tự tin để đưa ra đánh giá chính xác. Những kết quả này chỉ nên được xem là tham khảo và cần được kiểm tra lại trước khi sử dụng để đánh giá hiệu suất hoặc chất lượng cuộc gọi.`
          : reliabilityType === "warning"
            ? `Trong ${total} cuộc gọi được phân tích, có ${lowConfidenceCount} cuộc gọi mà hệ thống gặp khó khăn khi đánh giá do nội dung hoặc chất lượng âm thanh chưa đủ rõ ràng. Một số kết quả nên được xem xét lại trước khi đưa ra kết luận chính thức.`
            : `Độ tin cậy trung bình của hệ thống trong tháng đạt ${toPercent(
                avgConfidence,
              )}. Phần lớn các cuộc gọi được phân tích với mức độ ổn định tốt và có thể sử dụng để hỗ trợ theo dõi chất lượng dịch vụ.`,
      action:
        reliabilityType === "danger"
          ? "Ưu tiên nghe lại các cuộc gọi được hệ thống đánh dấu có độ tin cậy thấp trước khi sử dụng kết quả để đánh giá hoặc đưa ra quyết định."
          : reliabilityType === "warning"
            ? "Kiểm tra thêm các cuộc gọi có độ tin cậy thấp để đảm bảo kết quả phản ánh đúng nội dung trao đổi thực tế."
            : "Tiếp tục sử dụng kết quả phân tích như công cụ hỗ trợ theo dõi chất lượng, đồng thời duy trì kiểm tra mẫu định kỳ khi cần.",
    }),
  );

  return insights;
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

const getAdminInsightService = async (month) => {
  const insights = [];

  const selectedMonth = month || formatMonth(new Date());
  const { start, end } = buildMonthRange(selectedMonth);

  const system = await db.UserMonthlyStats.findAll({
    where: { month: selectedMonth },
    attributes: [
      [fn("COUNT", col("id")), "totalUsers"],
      [fn("SUM", col("totalConversations")), "totalAudio"],
      [fn("AVG", col("avgScore")), "avgScore"],
      [fn("SUM", col("negativeCount")), "totalNegative"],
      [fn("AVG", col("customer")), "avgCustomerScore"],
      [fn("AVG", col("staff")), "avgStaffScore"],

      [
        Sequelize.literal(`
          SUM(CASE WHEN avgScore < 0.4 THEN 1 ELSE 0 END)
        `),
        "lowUserCount",
      ],
      [
        Sequelize.literal(`
          SUM(CASE WHEN avgScore < 0.6 THEN 1 ELSE 0 END)
        `),
        "mediumUserCount",
      ],

      [
        Sequelize.literal(`
          SUM(CASE WHEN staff < 0.4 THEN 1 ELSE 0 END)
        `),
        "lowStaffUserCount",
      ],
      [
        Sequelize.literal(`
          SUM(CASE WHEN staff < 0.6 THEN 1 ELSE 0 END)
        `),
        "mediumStaffUserCount",
      ],

      [
        Sequelize.literal(`
          SUM(CASE WHEN customer < 0.4 THEN 1 ELSE 0 END)
        `),
        "lowCustomerUserCount",
      ],
      [
        Sequelize.literal(`
          SUM(CASE WHEN customer < 0.6 THEN 1 ELSE 0 END)
        `),
        "mediumCustomerUserCount",
      ],
    ],
    raw: true,
  });

  const data = system[0] || {};

  const totalUsers = Number(data.totalUsers || 0);
  const totalAudio = Number(data.totalAudio || 0);

  const avgScore = Number(data.avgScore || 0);
  const avgCustomerScore = Number(data.avgCustomerScore || 0);
  const avgStaffScore = Number(data.avgStaffScore || 0);

  const totalNegative = Number(data.totalNegative || 0);

  const lowUserCount = Number(data.lowUserCount || 0);
  const mediumUserCount = Number(data.mediumUserCount || 0);

  const lowStaffUserCount = Number(data.lowStaffUserCount || 0);
  const mediumStaffUserCount = Number(data.mediumStaffUserCount || 0);

  const lowCustomerUserCount = Number(data.lowCustomerUserCount || 0);
  const mediumCustomerUserCount = Number(data.mediumCustomerUserCount || 0);

  const negativeRate = totalAudio ? totalNegative / totalAudio : 0;

  const lowUserRate = totalUsers ? lowUserCount / totalUsers : 0;
  const mediumUserRate = totalUsers ? mediumUserCount / totalUsers : 0;

  const lowStaffUserRate = totalUsers ? lowStaffUserCount / totalUsers : 0;
  const mediumStaffUserRate = totalUsers
    ? mediumStaffUserCount / totalUsers
    : 0;

  const lowCustomerUserRate = totalUsers
    ? lowCustomerUserCount / totalUsers
    : 0;
  const mediumCustomerUserRate = totalUsers
    ? mediumCustomerUserCount / totalUsers
    : 0;

  const riskRate = Math.max(
    negativeRate,
    lowUserRate,
    lowCustomerUserRate,
    lowStaffUserRate,
  );

  const reliability = await db.Conversation.findAll({
    attributes: [
      [fn("COUNT", col("Conversation.id")), "totalConversation"],
      [fn("AVG", col("analysis.confidence")), "avgConfidence"],
      [
        Sequelize.literal(`
        SUM(CASE WHEN analysis.confidence < 0.6 THEN 1 ELSE 0 END)
      `),
        "lowConfidenceCount",
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
      createdAt: {
        [Op.between]: [start, end],
      },
    },
    raw: true,
  });

  const reliabilityData = reliability[0] || {};

  const totalReliabilityConversation = Number(
    reliabilityData.totalConversation || 0,
  );

  const avgSystemConfidence = Number(reliabilityData.avgConfidence || 0);

  const lowConfidenceConversationCount = Number(
    reliabilityData.lowConfidenceCount || 0,
  );

  const lowConfidenceConversationRate = totalReliabilityConversation
    ? lowConfidenceConversationCount / totalReliabilityConversation
    : 0;

  const totalUsersText = totalUsers || 0;
  const totalAudioText = totalAudio || 0;
  const negativeRateText = toPercent(negativeRate);

  /* =========================
     1. PERFORMANCE
  ========================= */
  if (avgScore < 0.4 || lowUserRate >= 0.3) {
    insights.push(
      makeInsight({
        scope: "admin",
        group: "performance",
        type: "danger",
        title: "Hiệu quả làm việc của đội ngũ đang giảm",
        metric: `${lowUserCount} nhân viên`,
        message: `Có ${lowUserCount}/${totalUsersText} nhân viên đang có kết quả cuộc gọi thấp hơn mức mong muốn. Mức hiệu quả trung bình của toàn đội hiện ở mức ${formatScore(avgScore)}.`,
        action:
          "Ưu tiên hỗ trợ hoặc rà soát nhóm nhân viên có kết quả thấp để xác định nguyên nhân.",
      }),
    );
  } else if (avgScore < 0.6 || mediumUserRate >= 0.3) {
    insights.push(
      makeInsight({
        scope: "admin",
        group: "performance",
        type: "warning",
        title: "Hiệu quả làm việc cần được theo dõi",
        metric: `${mediumUserCount} nhân viên`,
        message: `Có ${mediumUserCount}/${totalUsersText} nhân viên đang có kết quả thấp hơn mặt bằng chung của đội ngũ.`,
        action:
          "Theo dõi xu hướng chất lượng cuộc gọi của nhóm nhân viên này trong thời gian tới.",
      }),
    );
  } else {
    insights.push(
      makeInsight({
        scope: "admin",
        group: "performance",
        type: "good",
        title: "Hiệu quả làm việc của đội ngũ ổn định",
        metric: `${totalUsersText} nhân viên`,
        message: `Phần lớn nhân viên đang duy trì chất lượng cuộc gọi tốt. Mức hiệu quả trung bình toàn hệ thống hiện đạt ${formatScore(avgScore)}.`,
        action:
          "Tiếp tục duy trì hoạt động theo dõi định kỳ và chia sẻ kinh nghiệm từ các nhân viên có kết quả tốt.",
      }),
    );
  }

  /* =========================
     2. CUSTOMER EXPERIENCE
  ========================= */
  if (
    negativeRate >= 0.3 ||
    avgCustomerScore < 0.4 ||
    lowCustomerUserRate >= 0.3
  ) {
    insights.push(
      makeInsight({
        scope: "admin",
        group: "customer",
        type: "danger",
        title: "Trải nghiệm khách hàng đang có dấu hiệu suy giảm",
        metric: `${totalNegative} cuộc gọi`,
        message: `Trong tháng đã ghi nhận ${totalNegative}/${totalAudioText} cuộc gọi có phản hồi chưa tích cực từ khách hàng. Đồng thời có ${lowCustomerUserCount}/${totalUsersText} nhân viên thường xuyên xuất hiện trong các cuộc gọi có mức độ hài lòng thấp.`,
        action:
          "Ưu tiên rà soát các cuộc gọi có phản hồi tiêu cực để xác định nguyên nhân và xây dựng kế hoạch cải thiện.",
      }),
    );
  } else if (
    negativeRate >= 0.15 ||
    avgCustomerScore < 0.6 ||
    mediumCustomerUserRate >= 0.3
  ) {
    insights.push(
      makeInsight({
        scope: "admin",
        group: "customer",
        type: "warning",
        title: "Trải nghiệm khách hàng cần được cải thiện",
        metric: `${mediumCustomerUserCount} nhân viên`,
        message: `Khoảng ${negativeRateText} cuộc gọi trong tháng xuất hiện dấu hiệu khách hàng chưa hài lòng. Một số nhân viên cũng đang có kết quả thấp hơn kỳ vọng trong việc tạo trải nghiệm tích cực cho khách hàng.`,
        action:
          "Theo dõi các nhóm cuộc gọi có phản hồi chưa tích cực để phát hiện sớm các vấn đề phát sinh.",
      }),
    );
  } else {
    insights.push(
      makeInsight({
        scope: "admin",
        group: "customer",
        type: "good",
        title: "Khách hàng nhìn chung hài lòng",
        metric: negativeRateText,
        message: `Tỷ lệ cuộc gọi có phản hồi chưa tích cực đang ở mức thấp (${negativeRateText}). Phần lớn khách hàng có trải nghiệm ổn định trong quá trình trao đổi.`,
        action:
          "Tiếp tục duy trì chất lượng phục vụ và theo dõi các trường hợp bất thường.",
      }),
    );
  }

  /* =========================
     3. STAFF QUALITY
  ========================= */
  if (avgStaffScore < 0.4 || lowStaffUserRate >= 0.3) {
    insights.push(
      makeInsight({
        scope: "admin",
        group: "staff",
        type: "danger",
        title: "Một số nhân viên cần được hỗ trợ",
        metric: `${lowStaffUserCount} nhân viên`,
        message: `Có ${lowStaffUserCount}/${totalUsersText} nhân viên thường xuyên xuất hiện trong các cuộc gọi có chất lượng xử lý thấp.`,
        action:
          "Kiểm tra các cuộc gọi gần đây của nhóm nhân viên này để xác định kỹ năng cần cải thiện.",
      }),
    );
  } else if (
    avgStaffScore < 0.6 ||
    mediumStaffUserRate >= 0.3 ||
    lowStaffUserCount > 0
  ) {
    insights.push(
      makeInsight({
        scope: "admin",
        group: "staff",
        type: "warning",
        title: "Chất lượng xử lý cuộc gọi chưa đồng đều",
        metric: `${mediumStaffUserCount} nhân viên`,
        message: `Có ${mediumStaffUserCount}/${totalUsersText} nhân viên đang có kết quả thấp hơn mặt bằng chung của đội ngũ.`,
        action:
          "Theo dõi thêm hiệu suất và hỗ trợ đào tạo đối với nhóm nhân viên có kết quả thấp.",
      }),
    );
  } else {
    insights.push(
      makeInsight({
        scope: "admin",
        group: "staff",
        type: "good",
        title: "Đội ngũ đang duy trì chất lượng tốt",
        metric: `${totalUsersText} nhân viên`,
        message: `Phần lớn nhân viên đang xử lý cuộc gọi hiệu quả và duy trì chất lượng ổn định.`,
        action:
          "Tiếp tục duy trì hoạt động đánh giá và chia sẻ kinh nghiệm nội bộ.",
      }),
    );
  }

  /* =========================
     4. RISK
  ========================= */
  if (riskRate >= 0.3 || negativeRate >= 0.3) {
    insights.push(
      makeInsight({
        scope: "admin",
        group: "risk",
        type: "danger",
        title: "Nhiều cuộc gọi cần được rà soát",
        metric: `${totalNegative} cuộc gọi`,
        message: `Hệ thống ghi nhận ${totalNegative} cuộc gọi có dấu hiệu khách hàng chưa hài lòng hoặc chất lượng trao đổi chưa đạt kỳ vọng. Mức cảnh báo hiện đang ở ngưỡng cao.`,
        action:
          "Ưu tiên kiểm tra các cuộc gọi được hệ thống cảnh báo để phát hiện sớm các vấn đề về quy trình hoặc kỹ năng xử lý.",
      }),
    );
  } else if (riskRate >= 0.15 || negativeRate >= 0.15 || totalNegative > 0) {
    insights.push(
      makeInsight({
        scope: "admin",
        group: "risk",
        type: "warning",
        title: "Xuất hiện một số tín hiệu cần theo dõi",
        metric: `${totalNegative} cuộc gọi`,
        message: `Hệ thống phát hiện ${totalNegative} cuộc gọi có dấu hiệu bất thường hoặc phản hồi chưa tích cực từ khách hàng.`,
        action:
          "Theo dõi xu hướng trong các tuần tiếp theo để ngăn ngừa rủi ro gia tăng.",
      }),
    );
  } else {
    insights.push(
      makeInsight({
        scope: "admin",
        group: "risk",
        type: "good",
        title: "Chưa phát hiện rủi ro đáng chú ý",
        metric: "0 cuộc gọi",
        message:
          "Phần lớn các cuộc gọi đang diễn ra ổn định và chưa xuất hiện nhiều tín hiệu tiêu cực đáng kể.",
        action: "Tiếp tục duy trì hoạt động giám sát chất lượng định kỳ.",
      }),
    );
  }

  /* =========================
   5. AI RELIABILITY
========================= */
  const reliabilityType = getReliabilityType(
    avgSystemConfidence,
    lowConfidenceConversationRate,
  );

  insights.push(
    makeInsight({
      scope: "admin",
      group: "reliability",
      type: reliabilityType,
      title: getReliabilityTitle(reliabilityType, "admin"),
      metric: toPercent(avgSystemConfidence),
      message:
        reliabilityType === "danger"
          ? `Trong ${totalReliabilityConversation} cuộc gọi được phân tích, có ${lowConfidenceConversationCount} cuộc gọi mà hệ thống chưa đủ tự tin để đưa ra đánh giá chính xác. Các kết quả này không nên được dùng trực tiếp để đánh giá nhân viên nếu chưa được kiểm tra lại.`
          : reliabilityType === "warning"
            ? `Trong ${totalReliabilityConversation} cuộc gọi được phân tích, có ${lowConfidenceConversationCount} cuộc gọi mà hệ thống gặp khó khăn khi đánh giá do nội dung hoặc chất lượng âm thanh chưa đủ rõ ràng. Một phần kết quả nên được đối chiếu lại trước khi đưa ra kết luận chính thức.`
            : `Độ tin cậy trung bình của hệ thống đạt ${toPercent(
                avgSystemConfidence,
              )}. Phần lớn các cuộc gọi được phân tích với mức độ ổn định tốt và có thể dùng để hỗ trợ theo dõi chất lượng dịch vụ.`,
      action:
        reliabilityType === "danger"
          ? "Ưu tiên nghe lại các cuộc gọi có độ tin cậy thấp trước khi sử dụng kết quả để đánh giá nhân viên hoặc lập báo cáo quản trị."
          : reliabilityType === "warning"
            ? "Kiểm tra thêm các cuộc gọi có độ tin cậy thấp, đặc biệt là những trường hợp có kết quả bất thường."
            : "Tiếp tục sử dụng hệ thống như công cụ hỗ trợ theo dõi chất lượng, đồng thời duy trì kiểm tra mẫu định kỳ khi cần.",
    }),
  );

  return insights;
};

export {
  getSentimentDistributionByUserService,
  getDashboardDailyService,
  getMonthlyKpiService,
  getInsightService,
  getUserInsightService,
  //==================ADMIN=========================
  recalcUserMonthlyStats,
  getAdminDashboardService,
  getAdminUserDetailService,
  getAdminInsightService,
};
