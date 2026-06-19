import db from "../models/index.js";
import { Op } from "sequelize";
import { buildMonthRange } from "../utils/monthFilter.js";

const getAdminConversationsService = async (query) => {
  try {
    const {
      page = 1,
      limit = 10,
      month,
      sentiment,
      emotion,
      minScore,
      maxScore,
      search,
      status,
    } = query;

    const offset = (page - 1) * limit;
    // =========================
    // FILTER CONVERSATION
    // =========================
    const conversationWhere = {};

    if (status) {
      conversationWhere.status = status;
    }

    // month filter
    if (month) {
      const { start, end } = buildMonthRange(month);

      conversationWhere.createdAt = {
        [Op.between]: [start, end],
      };
    }

    // =========================
    // FILTER ANALYSIS
    // =========================
    const analysisWhere = {};
    if (sentiment) {
      analysisWhere.sentiment = sentiment;
    }
    if (emotion) {
      analysisWhere.emotion = emotion;
    }
    if (minScore || maxScore) {
      analysisWhere.score = {};
      if (minScore) {
        analysisWhere.score[Op.gte] = Number(minScore);
      }
      if (maxScore) {
        analysisWhere.score[Op.lte] = Number(maxScore);
      }
    }

    const { count, rows } = await db.Conversation.findAndCountAll({
      where: conversationWhere,
      include: [
        {
          model: db.AnalysisResult,
          as: "analysis",
          where:
            Object.keys(analysisWhere).length > 0 ? analysisWhere : undefined,
          required: Object.keys(analysisWhere).length > 0,
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
          model: db.User,
          as: "user",
          attributes: ["id", "fullName", "email", "image"],
        },

        // SEARCH TRANSCRIPT
        {
          model: db.SpeakerSegment,
          as: "segments",
          attributes: ["id", "text"],
          required: !!search,
          where: search
            ? {
                text: {
                  [Op.like]: `%${search}%`,
                },
              }
            : undefined,
        },
      ],

      distinct: true,
      limit: Number(limit),
      offset: Number(offset),
      order: [["createdAt", "DESC"]],
    });

    // =========================
    // FORMAT RESPONSE
    // =========================
    const formattedRows = rows.map((item) => {
      const json = item.toJSON();

      return {
        id: json.id,
        audioUrl: json.audioUrl,
        status: json.status,
        createdAt: json.createdAt,
        updatedAt: json.updatedAt,
        user: json.user,
        analysis: json.analysis,
        matchedTranscript:
          search && json.segments?.length > 0 ? json.segments[0].text : null,
      };
    });

    return {
      errCode: 0,
      data: {
        rows: formattedRows,
        total: count,
        page: Number(page),
        totalPages: Math.ceil(count / limit),
      },
    };
  } catch (error) {
    console.error(error);

    return {
      errCode: 1,
      errMessage: "Server error",
    };
  }
};

const getAdminConversationDetailService = async (conversationId) => {
  try {
    const data = await db.Conversation.findOne({
      where: { id: conversationId },
      attributes: ["id", "audioUrl", "status", "createdAt", "updatedAt"],
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["id", "fullName", "email", "image"],
        },
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
            "createdAt",
          ],
        },
      ],

      // =========================
      // SORT SEGMENTS
      // =========================
      order: [
        [{ model: db.SpeakerSegment, as: "segments" }, "startTime", "ASC"],
      ],
    });

    if (!data) {
      return {
        errCode: 1,
        errMessage: "Conversation not found",
      };
    }

    // =========================
    // TO JSON
    // =========================
    const json = data.toJSON();

    // =========================
    // CLEAN SEGMENTS
    // =========================
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

    if (json.SpeakerAnalysisResult?.length) {
      json.SpeakerAnalysisResult = json.SpeakerAnalysisResult.map(
        (speaker) => ({
          ...speaker,

          score: Number((speaker.score || 0).toFixed(2)),

          confidence: Number((speaker.confidence || 0).toFixed(2)),
        }),
      );
    }
    if (json.voiceTone?.length) {
      json.voiceTone = json.voiceTone.map((tone) => ({
        ...tone,

        toneScore: Number((tone.toneScore || 0).toFixed(2)),

        toneConfidence: Number((tone.toneConfidence || 0).toFixed(2)),
      }));
    }

    // =========================
    // BUILD RESPONSE
    // =========================
    const formattedData = {
      id: json.id,
      audioUrl: json.audioUrl,
      status: json.status,
      createdAt: json.createdAt,
      updatedAt: json.updatedAt,

      user: {
        id: json.user?.id,
        fullName: json.user?.fullName,
        email: json.user?.email,
        image: json.user?.image,
      },
      analysis: json.analysis || null,
      speakers: json.SpeakerAnalysisResult || [],
      voiceTone: json.voiceTone || [],
      segments: validSegments,

      stats: {
        duration,
        totalSegments: validSegments.length,
        processingStatus: json.status,
      },
    };

    return {
      errCode: 0,
      data: formattedData,
    };
  } catch (error) {
    console.error(error);

    return {
      errCode: 1,
      errMessage: "Server error",
    };
  }
};

export { getAdminConversationsService, getAdminConversationDetailService };
