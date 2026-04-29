// import OpenAI from "openai";
// import fs from "fs";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// const speechToTextService = async (audioPath) => {
//   try {
//     const raw = await openai.audio.transcriptions.create({
//       file: fs.createReadStream(audioPath),
//       model: "whisper-1",
//       response_format: "verbose_json",
//     });

//     console.log("WHISPER SEGMENTS:", raw.segments);

//     const clean = await openai.audio.transcriptions.create({
//       file: fs.createReadStream(audioPath),
//       model: "gpt-4o-transcribe",
//       response_format: "json",
//     });

//     return {
//       errCode: 0,
//       rawText: raw.text || "",
//       cleanText: clean.text || "",
//       segments: raw.segments || [],
//     };
//   } catch (error) {
//     console.error("STT error:", error);

//     return {
//       errCode: 1,
//       rawText: "",
//       cleanText: "",
//       segments: [],
//     };
//   }
// };
// export { speechToTextService };

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
