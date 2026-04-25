import { speechToTextService } from "../services/ai/sttService.js";
import { analyzeEmotionService } from "../services/ai/emotionService.js";
import {
  handleUploadAudioService,
  handleAnalyzeEmotionService,
} from "../services/application/audioPipelineService.js";

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

    const result = await handleUploadAudioService(userId, file.path);

    if (result.errCode !== 0) {
      return res.status(500).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Upload Controller Error:", error);

    return res.status(500).json({
      errCode: 1,
      message: "Internal server error",
    });
  }
};

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

export {
  speechToTextController,
  analyzeEmotionController,
  uploadAudioController,
  analyzeEmotion,
};
