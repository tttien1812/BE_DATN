import { Worker } from "bullmq";
import IORedis from "ioredis";
import {
  handleUploadAudioService,
  handleAnalyzeEmotionService,
} from "../services/application/audioPipelineService.js";
import db from "../models/index.js";

const connection = new IORedis({
  host: "127.0.0.1",
  port: 6379,
  maxRetriesPerRequest: null,
});

const worker = new Worker(
  "audio-processing",
  async (job) => {
    const { userId, audioPath, conversationId } = job.data;

    console.log(`🚀 Processing Conversation: ${conversationId}`);

    try {
      // BƯỚC 1: Chạy STT & Diarization (Truyền thêm conversationId)
      const uploadRes = await handleUploadAudioService(
        conversationId,
        userId,
        audioPath,
      );
      if (uploadRes.errCode !== 0) throw new Error(uploadRes.message);

      // BƯỚC 2: Phân tích cảm xúc
      const emotionRes = await handleAnalyzeEmotionService(conversationId);
      if (emotionRes.errCode !== 0) throw new Error(emotionRes.message);

      // BƯỚC 3: Cập nhật trạng thái hoàn thành
      const [affectedRows] = await db.Conversation.update(
        { status: "done" },
        { where: { id: conversationId } },
      );

      console.log("UPDATE DONE rows =", affectedRows);
      console.log("conversationId =", conversationId);

      const checkConversation = await db.Conversation.findByPk(conversationId);
      console.log("AFTER UPDATE =", checkConversation?.toJSON());

      console.log(`✅ Hoàn thành xử lý: ${conversationId}`);
    } catch (err) {
      console.error(`❌ Lỗi Worker tại ID ${conversationId}:`, err.message);
      await db.Conversation.update(
        { status: "failed" },
        { where: { id: conversationId } },
      );
    }
  },
  { connection },
);

worker.on("completed", (job) => {
  console.log(`🎉 Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
});
