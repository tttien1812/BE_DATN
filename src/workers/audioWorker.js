import { Worker } from "bullmq";
import IORedis from "ioredis";
import {
  handleUploadAudioService,
  handleAnalyzeEmotionService,
  handleAnalyzeVoiceToneService,
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

    console.log("=======================================");
    console.log(`🚀 Processing Conversation: ${conversationId}`);
    console.log("=======================================");

    const totalStart = Date.now();

    try {
      /* =====================================
         STEP 1: STT + DIARIZATION + SAVE DB
      ===================================== */
      const step1Start = Date.now();

      const uploadRes = await handleUploadAudioService(
        conversationId,
        userId,
        audioPath,
      );

      const step1Time = ((Date.now() - step1Start) / 1000).toFixed(2);
      await job.updateProgress(35);
      await job.log("Upload pipeline done");

      console.log(`⏱ STEP 1 Upload Pipeline: ${step1Time}s`);

      if (uploadRes.errCode !== 0) {
        throw new Error(uploadRes.message);
      }

      /* =====================================
   STEP 1.5 AUDIO TONE ANALYSIS
===================================== */
      const toneStart = Date.now();

      const toneRes = await handleAnalyzeVoiceToneService(
        conversationId,
        audioPath,
      );

      const toneTime = ((Date.now() - toneStart) / 1000).toFixed(2);
      await job.updateProgress(50);
      await job.log("Voice tone done");

      console.log(`⏱ STEP 1.5 Voice Tone: ${toneTime}s`);

      if (toneRes.errCode !== 0) {
        throw new Error(toneRes.message);
      }

      /* =====================================
         STEP 2: AI EMOTION ANALYSIS
      ===================================== */
      const step2Start = Date.now();

      const emotionRes = await handleAnalyzeEmotionService(conversationId);

      const step2Time = ((Date.now() - step2Start) / 1000).toFixed(2);
      await job.updateProgress(90);
      await job.log("Emotion analysis done");

      console.log(`⏱ STEP 2 Emotion Analysis: ${step2Time}s`);

      if (emotionRes.errCode !== 0) {
        throw new Error(emotionRes.message);
      }

      /* =====================================
         STEP 3: UPDATE STATUS
      ===================================== */
      const step3Start = Date.now();

      const [affectedRows] = await db.Conversation.update(
        { status: "done" },
        { where: { id: conversationId } },
      );

      const step3Time = ((Date.now() - step3Start) / 1000).toFixed(2);

      console.log(`⏱ STEP 3 Update Status: ${step3Time}s`);
      console.log("UPDATE DONE rows =", affectedRows);

      /* =====================================
         TOTAL
      ===================================== */
      const totalTime = ((Date.now() - totalStart) / 1000).toFixed(2);

      console.log("---------------------------------------");
      console.log(`✅ Hoàn thành xử lý: ${conversationId}`);
      console.log(`🔥 TOTAL TIME: ${totalTime}s`);
      console.log("---------------------------------------");

      await job.updateProgress(100);
      await job.log("Job completed");
    } catch (err) {
      const failTime = ((Date.now() - totalStart) / 1000).toFixed(2);

      console.error(`❌ Lỗi Worker tại ID ${conversationId}:`, err.message);

      console.log(`⏱ FAILED AFTER: ${failTime}s`);

      await db.Conversation.update(
        { status: "failed" },
        { where: { id: conversationId } },
      );
    }
  },
  {
    connection,
    concurrency: 2, // giữ 1 để debug trước
  },
);

worker.on("completed", (job) => {
  console.log(`🎉 Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});
