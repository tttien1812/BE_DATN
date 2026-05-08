import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class Conversation extends Model {
    static associate(models) {
      Conversation.hasOne(models.Transcript, {
        foreignKey: "conversationId",
        as: "transcript",
      });
      Conversation.hasOne(models.AnalysisResult, {
        foreignKey: "conversationId",
        as: "analysis",
      });
      Conversation.belongsTo(models.User, {
        foreignKey: "userId",
      });
      Conversation.hasMany(models.SpeakerSegment, {
        foreignKey: "conversationId",
        as: "segments",
      });
      Conversation.hasMany(models.SpeakerAnalysisResult, {
        foreignKey: "conversationId",
        as: "SpeakerAnalysisResult",
      });
      Conversation.hasMany(models.VoiceToneResult, {
        foreignKey: "conversationId",
        as: "voiceTone",
      });
    }
  }

  Conversation.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      audioUrl: {
        type: DataTypes.STRING,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: "processing",
      },
    },
    {
      sequelize,
      modelName: "Conversation",
      tableName: "Conversations",
      timestamps: true,
    },
  );

  return Conversation;
};
