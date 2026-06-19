import { speechToTextService } from "../services/ai/sttService.js";
import { analyzeEmotionService } from "../services/ai/emotionService.js";
import {
  handleUploadAudioService,
  handleAnalyzeEmotionService,
} from "../services/application/audioPipelineService.js";
import audioQueue from "../queues/audioQueue.js";
import db from "../models/index.js";

const speechToTextController = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        errCode: 1,
        message: "Missing audio file",
      });
    }

    const result = await speechToTextService(file.path);

    if (result.errCode !== 0) {
      return res.status(500).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("STT Controller Error:", error);

    return res.status(500).json({
      errCode: 1,
      message: "Internal server error",
    });
  }
};

const analyzeEmotionController = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        errCode: 1,
        message: "Missing text",
      });
    }

    const result = await analyzeEmotionService(text);

    if (result.errCode !== 0) {
      return res.status(500).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Emotion Controller Error:", error);

    return res.status(500).json({
      errCode: 1,
      message: "Internal server error",
    });
  }
};

// const uploadAudioController = async (req, res) => {
//   try {
//     const { userId } = req.body;
//     const file = req.file;

//     if (!userId || !file) {
//       return res.status(400).json({
//         errCode: 1,
//         message: "Missing userId or audio file",
//       });
//     }

//     const result = await handleUploadAudioService(userId, file.path);

//     if (result.errCode !== 0) {
//       return res.status(500).json(result);
//     }

//     return res.status(200).json(result);
//   } catch (error) {
//     console.error("Upload Controller Error:", error);

//     return res.status(500).json({
//       errCode: 1,
//       message: "Internal server error",
//     });
//   }
// };

const analyzeEmotion = async (req, res) => {
  try {
    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({
        errCode: 1,
        message: "Missing conversationId",
      });
    }

    const result = await handleAnalyzeEmotionService(conversationId);

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      errCode: 1,
      message: err.message,
    });
  }
};

const uploadAudioController = async (req, res) => {
  try {
    const { userId } = req.body;
    const file = req.file;

    if (!userId || !file) {
      return res.status(400).json({
        errCode: 1,
        message: "Missing userId or audio file",
      });
    }

    // 🔥 1. tạo conversation trước
    const conversation = await db.Conversation.create({
      userId,
      audioUrl: file.path,
      status: "processing", // 👈 thêm field này trong DB nếu chưa có
    });

    console.log("CREATED conversation =", conversation.toJSON());

    // 🔥 2. đẩy vào queue
    await audioQueue.add("process-audio", {
      userId,
      audioPath: file.path,
      conversationId: conversation.id,
    });

    // 🔥 3. trả về NGAY
    return res.status(200).json({
      errCode: 0,
      message: "Upload success, processing...",
      data: {
        conversationId: conversation.id,
      },
    });
  } catch (error) {
    console.error("Upload Controller Error:", error);

    return res.status(500).json({
      errCode: 1,
      message: "Internal server error",
    });
  }
};

const getConversationStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const conversation = await db.Conversation.findByPk(id);

    if (!conversation) {
      return res.status(404).json({
        errCode: 1,
        message: "Conversation not found",
      });
    }

    return res.status(200).json({
      errCode: 0,
      data: {
        status: conversation.status,
      },
    });
  } catch (error) {
    return res.status(500).json({
      errCode: 1,
      message: error.message,
    });
  }
};

const getConversationResult = async (req, res) => {
  try {
    const { id } = req.params;

    // const transcript = await db.Transcript.findOne({
    //   where: { conversationId: id },
    // });

    // const segments = await db.SpeakerSegment.findAll({
    //   where: { conversationId: id },
    //   order: [["startTime", "ASC"]], // 👈 thêm cho đúng thứ tự
    // });

    // const analysis = await db.AnalysisResult.findOne({
    //   where: { conversationId: id },
    // });

    // const speakerAnalysis = await db.SpeakerAnalysisResult.findAll({
    //   where: { conversationId: id },
    // });

    // const voiceTone = await db.VoiceToneResult.findAll({
    //   where: { conversationId: id },
    // });
    const [transcript, segments, analysis, speakerAnalysis, voiceTone] =
      await Promise.all([
        db.Transcript.findOne({
          where: { conversationId: id },
        }),

        db.SpeakerSegment.findAll({
          where: { conversationId: id },
          order: [["startTime", "ASC"]],
        }),

        db.AnalysisResult.findOne({
          where: { conversationId: id },
        }),

        db.SpeakerAnalysisResult.findAll({
          where: { conversationId: id },
        }),

        db.VoiceToneResult.findAll({
          where: { conversationId: id },
        }),
      ]);

    return res.json({
      errCode: 0,
      data: {
        transcript,
        speakerSegments: segments,
        analysis,
        speakerAnalysis,
        voiceTone,
      },
    });
  } catch (err) {
    return res.status(500).json({
      errCode: 1,
      message: err.message,
    });
  }
};

export {
  speechToTextController,
  analyzeEmotionController,
  uploadAudioController,
  analyzeEmotion,
  getConversationStatus,
  getConversationResult,
};
