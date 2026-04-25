import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const analyzeEmotionService = async (text) => {
  const start = Date.now();

  if (!text) {
    return {
      errCode: 1,
      data: null,
    };
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `
Return ONLY valid JSON:

{
  "sentiment": "positive | negative | neutral",
  "emotion": "happy | sad | angry | neutral",
  "voiceTone": "calm | stress | normal",
  "confidence": number,
  "emotions": {
    "happy": number,
    "sad": number,
    "angry": number,
    "fear": number,
    "surprise": number,
    "disgust": number,
    "neutral": number
  }
}
          `,
        },
        { role: "user", content: text },
      ],
    });

    let content = response.choices?.[0]?.message?.content || "{}";
    content = content.replace(/```json|```/g, "").trim();

    let parsed = JSON.parse(content);

    return {
      errCode: 0,
      data: {
        sentiment: parsed.sentiment || "neutral",
        emotion: parsed.emotion || "neutral",
        voiceTone: parsed.voiceTone || "normal",
        confidence: parsed.confidence || 0.8,
        emotions: parsed.emotions || {},
        processingTime: (Date.now() - start) / 1000,
      },
    };
  } catch (err) {
    console.error("Emotion error:", err);

    return {
      errCode: 1,
      data: {
        sentiment: "neutral",
        emotion: "neutral",
        voiceTone: "normal",
        confidence: 0.5,
        emotions: {},
        processingTime: 0,
      },
    };
  }
};

const refineTextWithGPT = async (text) => {
  if (!text || text.length < 5) return text;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
Bạn là AI sửa transcript tiếng Việt.

Nhiệm vụ:
- Sửa câu cho đúng nghĩa
- Giữ nguyên nội dung
- Không thêm ý mới
- Không rút gọn
- Không thay đổi ngữ cảnh

Chỉ trả về text đã sửa.
`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0.2,
    });

    return res.choices[0].message.content.trim();
  } catch (e) {
    console.error("Refine error:", e);
    return text;
  }
};

export { analyzeEmotionService, refineTextWithGPT };
