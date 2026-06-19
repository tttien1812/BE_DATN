import db from "../models/index.js";
import { fn, col, Op } from "sequelize";

const formatScore = (value) => Number(value || 0).toFixed(2);

const getConfidenceLabel = (confidence = 0) => {
  const value = Number(confidence || 0);

  if (value >= 0.75) return "Độ tin cậy cao";
  if (value >= 0.55) return "Độ tin cậy trung bình";
  return "Độ tin cậy thấp";
};

const getConfidenceType = (confidence = 0) => {
  const value = Number(confidence || 0);

  if (value >= 0.75) return "good";
  if (value >= 0.55) return "warning";
  return "danger";
};

const formatTime = (time) => {
  if (!time && time !== 0) return "00:00";
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

const makeCallInsight = ({
  scope,
  group,
  type,
  title,
  metric,
  message,
  action,
  confidence = null,
  confidenceLabel = null,
  segmentIds = [],
}) => ({
  scope,
  group,
  type,
  title,
  metric,
  message,
  action,
  confidence,
  confidenceLabel,
  segmentIds,
});

const getRoleBySpeaker = (speakerAnalysis = [], speakerLabel) => {
  return (
    speakerAnalysis.find((s) => s.speakerLabel === speakerLabel)?.role ||
    "unknown"
  );
};

const getHistoryDaysService = async (userId) => {
  try {
    const days = await db.Conversation.findAll({
      where: { userId },
      attributes: [[fn("DATE", col("createdAt")), "date"]],
      group: [fn("DATE", col("createdAt"))],
      order: [[fn("DATE", col("createdAt")), "DESC"]],
      raw: true,
    });

    return {
      errCode: 0,
      data: days.map((item) => item.date),
    };
  } catch (error) {
    console.error(error);
    return { errCode: 1 };
  }
};

const getHistoryByDateService = async (userId, date) => {
  try {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const conversations = await db.Conversation.findAll({
      where: {
        userId,
        createdAt: {
          [Op.between]: [start, end],
        },
      },
      attributes: ["id", "audioUrl", "status", "createdAt", "updatedAt"],
      include: [
        {
          model: db.AnalysisResult,
          as: "analysis",
          attributes: [
            "sentiment",
            "emotion",
            "score",
            "confidence",
            "customerScore",
            "staffScore",
          ],
        },
        {
          model: db.SpeakerAnalysisResult,
          as: "SpeakerAnalysisResult",
          attributes: [
            "speakerLabel",
            "role",
            "sentiment",
            "emotion",
            "score",
            "confidence",
          ],
        },
        {
          model: db.VoiceToneResult,
          as: "voiceTone",
          attributes: [
            "speakerLabel",
            "toneEmotion",
            "toneScore",
            "toneSentiment",
            "toneConfidence",
          ],
        },
        {
          model: db.SpeakerSegment,
          as: "segments",
          attributes: ["startTime", "endTime", "text"],
        },

        // {
        //   model: db.Transcript,
        //   as: "transcript",
        //   attributes: ["content"],
        // },
      ],

      order: [["createdAt", "DESC"]],
    });

    const formattedData = conversations.map((item) => {
      const json = item.toJSON();

      const validSegments = (json.segments || []).filter((segment) =>
        segment.text?.trim(),
      );

      const duration =
        validSegments.length > 0
          ? Math.max(...validSegments.map((s) => s.endTime || 0))
          : 0;

      if (json.analysis) {
        json.analysis.score = Number((json.analysis.score || 0).toFixed(2));

        json.analysis.confidence = Number(
          (json.analysis.confidence || 0).toFixed(2),
        );

        json.analysis.customerScore = Number(
          (json.analysis.customerScore || 0).toFixed(2),
        );

        json.analysis.staffScore = Number(
          (json.analysis.staffScore || 0).toFixed(2),
        );
      }

      if (json.voiceTone?.length) {
        json.voiceTone = json.voiceTone.map((tone) => ({
          ...tone,
          toneScore: Number((tone.toneScore || 0).toFixed(2)),
          toneConfidence: Number((tone.toneConfidence || 0).toFixed(2)),
        }));
      }

      return {
        ...json,
        duration,
        segments: undefined,
      };
    });

    return {
      errCode: 0,
      data: formattedData,
    };
  } catch (error) {
    console.error(error);
    return { errCode: 1 };
  }
};

const getHistoryDetailService = async (conversationId) => {
  try {
    const data = await db.Conversation.findOne({
      where: { id: conversationId },
      attributes: ["id", "audioUrl", "status", "createdAt", "updatedAt"],
      include: [
        // {
        //   model: db.Transcript,
        //   as: "transcript",
        //   attributes: ["content"],
        // },
        {
          model: db.AnalysisResult,
          as: "analysis",
          attributes: [
            "sentiment",
            "emotion",
            "score",
            "confidence",
            "customerScore",
            "staffScore",
            "createdAt",
          ],
        },
        {
          model: db.SpeakerAnalysisResult,
          as: "SpeakerAnalysisResult",
          attributes: [
            "speakerLabel",
            "role",
            "sentiment",
            "emotion",
            "score",
            "confidence",
          ],
        },
        {
          model: db.VoiceToneResult,
          as: "voiceTone",
          attributes: [
            "speakerLabel",
            "toneEmotion",
            "toneScore",
            "toneSentiment",
            "toneConfidence",
          ],
        },
        {
          model: db.SpeakerSegment,
          as: "segments",
          attributes: [
            "id",
            "speaker",
            "startTime",
            "endTime",
            "text",
            "emotion",
            "emotionScore",
            "emotionConfidence",
            "toneEmotion",
            "toneScore",
            "toneConfidence",
            "createdAt",
          ],

          order: [["startTime", "ASC"]],
        },
      ],

      order: [
        [{ model: db.SpeakerSegment, as: "segments" }, "startTime", "ASC"],
      ],
    });

    if (!data) {
      return { errCode: 1, errMessage: "Not found" };
    }

    return {
      errCode: 0,
      data,
    };
  } catch (error) {
    console.error(error);
    return { errCode: 1 };
  }
};

const getHistoryInsightService = async (conversationId, scope = "user") => {
  try {
    const result = await getHistoryDetailService(conversationId);

    if (result.errCode !== 0 || !result.data) {
      return {
        errCode: 1,
        message: "Conversation not found",
      };
    }

    const json = result.data.toJSON ? result.data.toJSON() : result.data;

    const analysis = json.analysis;
    const speakerAnalysis = json.SpeakerAnalysisResult || [];
    const voiceTone = json.voiceTone || [];
    const segments = json.segments || [];

    const insights = [];
    const validSegments = segments.filter((seg) => seg.text?.trim());

    const TEXT_CONFIDENCE = 0.6;
    const VOICE_CONFIDENCE = 0.7;
    const VOICE_LOW_SCORE = 0.35;

    const dangerSegments = validSegments.filter(
      (seg) =>
        Number(seg.emotionConfidence || 0) >= TEXT_CONFIDENCE &&
        Number(seg.toneConfidence || 0) >= VOICE_CONFIDENCE &&
        Number(seg.emotionScore || 0.5) < 0.4 &&
        Number(seg.toneScore || 0.5) < VOICE_LOW_SCORE,
    );

    const warningSegments = validSegments.filter(
      (seg) =>
        Number(seg.emotionConfidence || 0) >= TEXT_CONFIDENCE &&
        Number(seg.toneConfidence || 0) >= VOICE_CONFIDENCE &&
        Number(seg.emotionScore || 0.5) >= 0.4 &&
        Number(seg.emotionScore || 0.5) <= 0.5 &&
        Number(seg.toneScore || 0.5) < VOICE_LOW_SCORE,
    );

    const reviewSegments = validSegments.filter(
      (seg) =>
        Number(seg.emotionConfidence || 0) >= TEXT_CONFIDENCE &&
        Number(seg.toneConfidence || 0) >= VOICE_CONFIDENCE &&
        Number(seg.emotionScore || 0.5) > 0.5 &&
        Number(seg.toneScore || 0.5) < VOICE_LOW_SCORE,
    );

    const staffSpeaker = speakerAnalysis.find((s) => s.role === "staff");
    const customerSpeaker = speakerAnalysis.find((s) => s.role === "customer");

    const staffVoice = voiceTone.find(
      (v) => v.speakerLabel === staffSpeaker?.speakerLabel,
    );

    const customerVoice = voiceTone.find(
      (v) => v.speakerLabel === customerSpeaker?.speakerLabel,
    );

    const finalScore = Number(analysis?.score || 0);
    const customerScore = Number(analysis?.customerScore || 0);
    const staffScore = Number(analysis?.staffScore || 0);
    const finalConfidence = Number(analysis?.confidence || 0);

    const finalConfidenceLabel = getConfidenceLabel(finalConfidence);
    const reliabilityType = getConfidenceType(finalConfidence);

    /* =========================
       1. OVERALL
    ========================= */
    if (finalScore < 0.4) {
      insights.push(
        makeCallInsight({
          scope,
          group: "overall",
          type: "danger",
          title: "Cuộc gọi có chất lượng thấp",
          metric: formatScore(finalScore),
          message:
            "FinalScore của cuộc gọi dưới ngưỡng an toàn, cần được xem lại.",
          action:
            scope === "admin"
              ? "Ưu tiên đưa cuộc gọi này vào danh sách review chất lượng."
              : "Nghe lại cuộc gọi để kiểm tra các đoạn có điểm thấp.",
        }),
      );
    } else if (finalScore < 0.6) {
      insights.push(
        makeCallInsight({
          scope,
          group: "overall",
          type: "warning",
          title: "Cuộc gọi ở mức trung bình",
          metric: formatScore(finalScore),
          message: "Cuộc gọi chưa quá xấu nhưng vẫn có dấu hiệu cần cải thiện.",
          action:
            "Kiểm tra các đoạn có voice tone tiêu cực hoặc text score thấp.",
        }),
      );
    } else {
      insights.push(
        makeCallInsight({
          scope,
          group: "overall",
          type: "good",
          title: "Cuộc gọi tương đối ổn định",
          metric: formatScore(finalScore),
          message: "FinalScore của cuộc gọi đang trong vùng an toàn.",
          action: "Tiếp tục theo dõi các cuộc gọi tiếp theo.",
        }),
      );
    }

    /* =========================
       1.5 AI RELIABILITY
       Luôn hiển thị để thể hiện AI chỉ hỗ trợ
    ========================= */
    insights.push(
      makeCallInsight({
        scope,
        group: "reliability",
        type: reliabilityType,
        title:
          reliabilityType === "danger"
            ? "Kết quả AI cần được kiểm chứng"
            : reliabilityType === "warning"
              ? "Kết quả AI nên được xem như tham khảo"
              : "Độ tin cậy AI ổn định",
        metric: `${Math.round(finalConfidence * 100)}%`,
        message:
          reliabilityType === "danger"
            ? "Độ tin cậy của AI trong cuộc gọi này thấp. Không nên dùng kết quả này như kết luận cuối cùng."
            : reliabilityType === "warning"
              ? "AI có độ tin cậy ở mức trung bình. Kết quả có thể hỗ trợ đánh giá nhưng vẫn nên kiểm tra lại các đoạn quan trọng."
              : "AI khá tự tin với kết quả phân tích cuộc gọi này.",
        action:
          reliabilityType === "danger"
            ? "Nghe lại audio và kiểm tra transcript trước khi đánh giá chất lượng cuộc gọi."
            : reliabilityType === "warning"
              ? "Ưu tiên xem lại các đoạn được đánh dấu hoặc các đoạn có score thấp."
              : "Có thể dùng kết quả để tham khảo, nhưng quyết định cuối cùng vẫn nên dựa trên audio và transcript.",
        confidence: finalConfidence,
        confidenceLabel: finalConfidenceLabel,
      }),
    );

    /* =========================
       2. CUSTOMER
    ========================= */
    if (customerScore < 0.4) {
      insights.push(
        makeCallInsight({
          scope,
          group: "customer",
          type: "danger",
          title: "Khách hàng có dấu hiệu chưa hài lòng",
          metric: formatScore(customerScore),
          message:
            "CustomerScore thấp, có khả năng khách hàng chưa có trải nghiệm tốt trong cuộc gọi.",
          action:
            "Nghe lại các đoạn khách hàng phản hồi để xác định nguyên nhân.",
        }),
      );
    } else if (customerScore < 0.6) {
      insights.push(
        makeCallInsight({
          scope,
          group: "customer",
          type: "warning",
          title: "Trải nghiệm khách hàng cần theo dõi",
          metric: formatScore(customerScore),
          message:
            "CustomerScore ở mức trung bình, chưa đủ tốt để xem là tích cực.",
          action:
            "Kiểm tra các đoạn customer có text emotion hoặc voice tone tiêu cực.",
        }),
      );
    }

    if (
      customerVoice &&
      Number(customerVoice.toneScore || 0) < 0.35 &&
      Number(customerVoice.toneConfidence || 0) >= 0.6
    ) {
      insights.push(
        makeCallInsight({
          scope,
          group: "customer",
          type: "warning",
          title: "Sắc thái khách hàng có dấu hiệu căng thẳng",
          metric: formatScore(customerVoice.toneScore),
          message:
            "Voice tone phía khách hàng thấp, có thể khách hàng đang không thoải mái.",
          action:
            "Nghe lại các đoạn customer có toneEmotion là angry/fear/disgust.",
        }),
      );
    }

    /* =========================
       3. STAFF
    ========================= */
    if (staffScore < 0.4) {
      insights.push(
        makeCallInsight({
          scope,
          group: "staff",
          type: "danger",
          title: "Chất lượng xử lý của nhân viên thấp",
          metric: formatScore(staffScore),
          message:
            "StaffScore thấp, cần kiểm tra lại cách tư vấn hoặc phản hồi của nhân viên.",
          action:
            scope === "admin"
              ? "Review cuộc gọi này trong hồ sơ đánh giá nhân viên."
              : "Nghe lại các đoạn Staff để cải thiện cách phản hồi.",
        }),
      );
    } else if (staffScore < 0.6) {
      insights.push(
        makeCallInsight({
          scope,
          group: "staff",
          type: "warning",
          title: "Chất lượng xử lý của nhân viên cần cải thiện",
          metric: formatScore(staffScore),
          message:
            "StaffScore ở mức trung bình, chưa phải rủi ro cao nhưng cần theo dõi.",
          action:
            "Kiểm tra các đoạn Staff có voice tone tiêu cực hoặc text score thấp.",
        }),
      );
    }

    if (
      staffVoice &&
      Number(staffVoice.toneScore || 0) < 0.35 &&
      Number(staffVoice.toneConfidence || 0) >= 0.6
    ) {
      insights.push(
        makeCallInsight({
          scope,
          group: "staff",
          type: "warning",
          title: "Sắc thái giọng nhân viên cần chú ý",
          metric: formatScore(staffVoice.toneScore),
          message:
            "Voice tone phía nhân viên thấp, có thể ảnh hưởng đến cảm nhận của khách hàng.",
          action:
            "Nghe lại các đoạn Staff có toneEmotion tiêu cực để đánh giá cách giao tiếp.",
        }),
      );
    }

    /* =========================
       4. SEGMENT RISK
    ========================= */
    if (dangerSegments.length > 0) {
      const segmentIds = dangerSegments.slice(0, 5).map((seg) => seg.id);
      const firstSeg = dangerSegments[0];

      insights.push(
        makeCallInsight({
          scope,
          group: "segment",
          type: "danger",
          title: "Phát hiện đoạn hội thoại có rủi ro cao",
          metric: `${dangerSegments.length} đoạn`,
          message: `Text score thấp và voice tone cũng tiêu cực. Đoạn đầu tiên tại ${formatTime(
            firstSeg.startTime,
          )}.`,
          action:
            "Ưu tiên nghe lại ngay các đoạn được đánh dấu vì đây là khu vực có nguy cơ phát sinh vấn đề cao nhất.",
          segmentIds,
        }),
      );
    }

    if (warningSegments.length > 0) {
      const segmentIds = warningSegments.slice(0, 5).map((seg) => seg.id);
      const firstSeg = warningSegments[0];

      insights.push(
        makeCallInsight({
          scope,
          group: "segment",
          type: "warning",
          title: "Phát hiện đoạn hội thoại cần theo dõi",
          metric: `${warningSegments.length} đoạn`,
          message: `Text score ở mức trung bình và voice tone chưa tốt. Đoạn đầu tiên tại ${formatTime(
            firstSeg.startTime,
          )}.`,
          action:
            "Nghe lại các đoạn được đánh dấu để xác định xem khách hàng có dấu hiệu không hài lòng hay không.",
          segmentIds,
        }),
      );
    }

    if (reviewSegments.length > 0) {
      const segmentIds = reviewSegments.slice(0, 5).map((seg) => seg.id);
      const firstSeg = reviewSegments[0];

      insights.push(
        makeCallInsight({
          scope,
          group: "voice",
          type: "good",
          title: "Có đoạn cần nghe lại để đánh giá khách quan",
          metric: `${reviewSegments.length} đoạn`,
          message: `Nội dung văn bản vẫn ổn nhưng voice tone có dấu hiệu tiêu cực. Đoạn đầu tiên tại ${formatTime(
            firstSeg.startTime,
          )}.`,
          action:
            "Nghe lại các đoạn này trước khi đưa ra kết luận vì voice model có thể bị bias hoặc bị ảnh hưởng bởi chất lượng âm thanh.",
          segmentIds,
        }),
      );
    }

    /* =========================
       SORT
    ========================= */
    const groupPriority = {
      reliability: 1,
      overall: 2,
      customer: 3,
      staff: 4,
      segment: 5,
      voice: 6,
    };

    const typePriority = {
      danger: 1,
      warning: 2,
      good: 3,
    };

    const sortedInsights = insights.sort((a, b) => {
      const typeDiff = typePriority[a.type] - typePriority[b.type];
      if (typeDiff !== 0) return typeDiff;

      return (groupPriority[a.group] || 99) - (groupPriority[b.group] || 99);
    });

    return {
      errCode: 0,
      data: sortedInsights,
    };
  } catch (error) {
    console.error("Get History Insight Error:", error);
    return {
      errCode: 1,
      message: error.message,
    };
  }
};

export {
  getHistoryDaysService,
  getHistoryByDateService,
  getHistoryDetailService,
  getHistoryInsightService,
};
