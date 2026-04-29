import {
  getDashboardDailyService,
  getMonthlyKpiService,
  getInsightService,
  //admin
  getAdminDashboardService,
  getAdminUserDetailService,
} from "../services/dashboardService.js";

const getDashboardDaily = async (req, res) => {
  try {
    const { userId, fromDate, toDate } = req.query;

    if (!userId) {
      return res.status(200).json({
        errCode: 1,
        message: "Missing userId",
      });
    }

    const data = await getDashboardDailyService(userId, fromDate, toDate);

    return res.status(200).json({
      errCode: 0,
      message: "OK",
      data,
    });
  } catch (error) {
    console.error("getDashboardDaily error:", error);

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
  getAdminDashboard,
  getDashboardDaily,
  getMonthlyKpi,
  getInsight,
  getAdminUserDetail,
};
