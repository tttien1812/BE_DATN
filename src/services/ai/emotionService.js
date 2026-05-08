import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const analyzeEmotionService = async (input) => {
  /*
    input = {
      fullText: "...",
      speakers: {
        SPEAKER_0: "...",
        SPEAKER_1: "..."
      }
    }
  */

  const start = Date.now();

  // if (!input || !input.fullText) {
  //   return { errCode: 1, data: null };
  // }
  if (!input || !input.speakers) {
    return { errCode: 1, data: null };
  }

  try {
    console.log("\n================ AI INPUT ================");
    console.log(JSON.stringify(input, null, 2));
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `
Determine business roles between EXACTLY two speakers in a customer service context.
CRITICAL CONSTRAINTS:
1. MUST identify ONE "staff" and ONE "customer". These roles are mutually exclusive.
2. If SPEAKER_00 is "staff", SPEAKER_01 MUST be "customer", and vice versa.
INTERACTION PATTERNS & DECISION LOGIC:
- The Staff (Agent): Leads the conversation, acts as the "Information Requester". They ask for phone numbers, addresses, names, or order codes. They explain policies and give instructions (e.g., "Cho em xin...", "Vui lòng đợi em kiểm tra...").
- The Customer (Client): Acts as the "Information Provider". They describe problems, provide personal details in response to requests, or confirm they have received help.
DO NOT RELY ON:
- Speaking time or word count (Staff can speak less than Customer).
- Politeness words like "dạ", "vâng", "cảm ơn" (Both can be polite).
- The order of speaking (Customer might speak first).
CONFLICT RESOLUTION:
- If both speakers seem professional, the one asking for verification data is the Staff.
- If both seem to provide info, the one who owns the problem/issue is the Customer.
Return ONLY valid JSON:
{
  "overall": {
    "sentiment": "positive | negative | neutral",
    "emotion": "happy | sad | angry | neutral",
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
  },
  "speakers": {
    "SPEAKER_0": {
      "role":"customer | staff",
      "sentiment": "...",
      "emotion": "...",
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
  }
}
          `,
        },
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
    });
    console.log("\n================ RAW RESPONSE ================");
    console.log(JSON.stringify(response, null, 2));

    let content = response.choices?.[0]?.message?.content || "{}";

    console.log("\n================ RAW CONTENT ================");
    console.log(content);
    content = content.replace(/```json|```/g, "").trim();
    console.log("\n================ CLEAN CONTENT ================");
    console.log(content);
    const parsed = JSON.parse(content);
    // 🔥 4. PARSED RESULT
    console.log("\n================ PARSED RESULT ================");
    console.log(JSON.stringify(parsed, null, 2));

    // 🔥 5. CHECK ROLE
    console.log("\n================ ROLE DEBUG ================");
    const speakers = parsed?.speakers || {};
    Object.entries(speakers).forEach(([key, val]) => {
      console.log(`👉 ${key}: role=${val.role}`);
    });
    return {
      errCode: 0,
      data: parsed,
      processingTime: (Date.now() - start) / 1000,
    };
  } catch (err) {
    console.error("Emotion error:", err);

    return {
      errCode: 1,
      data: null,
    };
  }
};

export { analyzeEmotionService };
