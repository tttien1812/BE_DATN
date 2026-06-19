import OpenAI from "openai";
import fs from "fs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const speechToTextService = async (audioPath) => {
  try {
    const result = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: "whisper-1",
      response_format: "verbose_json",
    });

    return {
      errCode: 0,
      rawText: result.text || "",
      cleanText: result.text || "",
      segments: result.segments || [],
    };
  } catch (error) {
    console.error("STT error:", error);

    return {
      errCode: 1,
      rawText: "",
      cleanText: "",
      segments: [],
    };
  }
};

export { speechToTextService };
