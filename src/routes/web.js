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
  getConversationStatus,
  getConversationResult,
} from "../controllers/speechController.js";
import {
  getMonthlyKpi,
  getInsight,
  getAdminDashboard,
  getAdminUserDetail,
  getDashboardDaily,
  getUserInsight,
  getAdminInsight,
} from "../controllers/dashboardController.js";
import upload from "../middleware/upload.js";
import {
  getHistoryDaysController,
  getHistoryByDateController,
  getHistoryDetailController,
  getHistoryInsight,
} from "../controllers/historyController.js";
import {
  getAdminConversations,
  getAdminConversationDetail,
} from "../controllers/adminConversationController.js";

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
  // router.post("/api/analyze-emotion", analyzeEmotion);
  router.get("/api/conversation/:id/status", getConversationStatus);
  router.get("/api/conversation/:id/result", getConversationResult);

  // Dashboard
  router.get("/api/dashboard-daily", getDashboardDaily);
  router.get("/api/monthly-kpi", getMonthlyKpi);
  router.get("/api/insight", getInsight);
  router.get("/api/admin-dashboard", getAdminDashboard);
  router.get("/api/admin-user-detail", getAdminUserDetail);
  router.get("/api/admin-insight", getAdminInsight);
  router.get("/api/user-insight", getUserInsight);

  // History
  router.get("/api/history/days", getHistoryDaysController);
  router.get("/api/history/by-date", getHistoryByDateController);
  router.get("/api/history/:id", getHistoryDetailController);
  router.get("/api/history/:conversationId/insights", getHistoryInsight);

  // Admin Conversation
  router.get("/api/admin/conversations", getAdminConversations);
  router.get("/api/admin/conversations/:id", getAdminConversationDetail);
  return app.use("/", router);
};

export default initApiRoutes;
