import express from "express";
import {
  handleLogin,
  handleGetAllUsers,
  handleCreateNewUser,
  handleEditUser,
  handleDeleteUser,
  handleGetUserById,
} from "../controllers/userController.js";
import {
  speechToTextController,
  analyzeEmotionController,
  uploadAudioController,
  analyzeEmotion,
} from "../controllers/speechController.js";
import {
  getSummaryByUser,
  getDetailsByUser,
  getDetailsGroupedByDate,
  getSentimentDistribution,
  getMonthlyKpi,
  getInsight,
  getAdminDashboard,
  getAdminUserDetail,
} from "../controllers/dashboardController.js";
import upload from "../middleware/upload.js";
import {
  getHistoryDaysController,
  getHistoryByDateController,
  getHistoryDetailController,
} from "../controllers/historyController.js";

const router = express.Router();

const initApiRoutes = (app) => {
  // User
  router.post("/api/login", handleLogin);
  router.get("/api/get-all-users", handleGetAllUsers);
  router.post("/api/create-users", handleCreateNewUser);
  router.put("/api/edit-users", upload.single("image"), handleEditUser);
  router.delete("/api/delete-users", handleDeleteUser);
  router.get("/api/users/:id", handleGetUserById);

  // Speech-to-text
  router.post(
    "/api/speech-to-text",
    upload.single("audio"),
    speechToTextController,
  );
  router.post("/api/analyze-emotion-controller", analyzeEmotionController);
  router.post(
    "/api/upload-audio",
    upload.single("audio"),
    uploadAudioController,
  );
  router.post("/api/analyze-emotion", analyzeEmotion);

  // Dashboard
  router.get("/api/summary", getSummaryByUser);
  router.get("/api/details", getDetailsByUser);
  router.get("/api/group-by-date", getDetailsGroupedByDate);
  router.get("/api/sentiment-distribution", getSentimentDistribution);
  router.get("/api/monthly-kpi", getMonthlyKpi);
  router.get("/api/insight", getInsight);
  router.get("/api/admin-dashboard", getAdminDashboard);
  router.get("/api/admin-user-detail", getAdminUserDetail);

  // History
  router.get("/api/history/days", getHistoryDaysController);
  router.get("/api/history/by-date", getHistoryByDateController);
  router.get("/api/history/:id", getHistoryDetailController);
  return app.use("/", router);
};

export default initApiRoutes;
