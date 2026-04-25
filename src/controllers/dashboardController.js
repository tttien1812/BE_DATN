import {
  getSummaryByUserService,
  getDetailsByUserService,
  getDetailsGroupedByDateService,
  getSentimentDistributionByUserService,
  getMonthlyKpiService,
  getInsightService,
  //admin
  getAdminDashboardService,
  getAdminUserDetailService,
} from "../services/dashboardService.js";

// 🔥 SUMMARY API
const getSummaryByUser = async (req, res) => {
  try {
    const { userId, fromDate, toDate } = req.query;

    if (!userId) {
      return res.status(400).json({
        errCode: 1,
        errMessage: "Missing userId",
      });
    }

    const data = await getSummaryByUserService(userId, fromDate, toDate);

    return res.status(200).json({
      errCode: 0,
      data,
    });
  } catch (e) {
    console.error("Summary Controller Error:", e);
    return res.status(500).json({
      errCode: 1,
      errMessage: "Internal server error",
    });
  }
};

// 🔥 DETAILS API
const getDetailsByUser = async (req, res) => {
  try {
    const { userId, fromDate, toDate } = req.query;

    if (!userId) {
      return res.status(400).json({
        errCode: 1,
        errMessage: "Missing userId",
      });
    }

    const data = await getDetailsByUserService(userId, fromDate, toDate);

    return res.status(200).json({
      errCode: 0,
      data,
    });
  } catch (e) {
    console.error("Details Controller Error:", e);
    return res.status(500).json({
      errCode: 1,
      errMessage: "Internal server error",
    });
  }
};

// 🔥 GROUP API
const getDetailsGroupedByDate = async (req, res) => {
  try {
    const { userId, fromDate, toDate } = req.query;

    if (!userId) {
      return res.status(400).json({
        errCode: 1,
        errMessage: "Missing userId",
      });
    }

    const data = await getDetailsGroupedByDateService(userId, fromDate, toDate);

    return res.status(200).json({
      errCode: 0,
      data,
    });
  } catch (e) {
    console.error("Group Controller Error:", e);
    return res.status(500).json({
      errCode: 1,
      errMessage: "Internal server error",
    });
  }
};
const getSentimentDistribution = async (req, res) => {
  try {
    const { userId, fromDate, toDate } = req.query;

    if (!userId) {
      return res.status(400).json({
        errCode: 1,
        message: "Missing userId",
      });
    }

    const data = await getSentimentDistributionByUserService(
      userId,
      fromDate,
      toDate,
    );

    return res.status(200).json({
      errCode: 0,
      data,
    });
  } catch (error) {
    console.error("Sentiment Distribution Error:", error);
    return res.status(500).json({
      errCode: -1,
      message: "Server error",
    });
  }
};

const getMonthlyKpi = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        errCode: 1,
        message: "Missing userId",
      });
    }

    const data = await getMonthlyKpiService(userId);

    return res.status(200).json({
      errCode: 0,
      data,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      errCode: -1,
      message: "Server error",
    });
  }
};

const getInsight = async (req, res) => {
  try {
    const userId = req.query;

    const data = await getInsightService(userId);

    return res.status(200).json({
      errCode: 0,
      data,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      errCode: 1,
      message: "Error from server",
    });
  }
};

//========================ADMIN API========================
const getAdminDashboard = async (req, res) => {
  try {
    const { sortBy, order, month } = req.query;

    const data = await getAdminDashboardService({
      sortBy,
      order,
      month,
    });

    return res.status(200).json({
      errCode: 0,
      data,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({
      errCode: 1,
      message: "Server error",
    });
  }
};

const getAdminUserDetail = async (req, res) => {
  try {
    const { userId, month } = req.query;

    if (!userId || !month) {
      return res.status(400).json({
        errCode: 1,
        message: "Missing userId or month",
      });
    }

    const data = await getAdminUserDetailService(userId, month);

    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({
      errCode: 1,
      message: e.message,
    });
  }
};

export {
  getSummaryByUser,
  getDetailsByUser,
  getDetailsGroupedByDate,
  getAdminDashboard,
  getSentimentDistribution,
  getMonthlyKpi,
  getInsight,
  getAdminUserDetail,
};
