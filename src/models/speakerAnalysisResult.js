import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class SpeakerAnalysisResult extends Model {
    static associate(models) {
      SpeakerAnalysisResult.belongsTo(models.Conversation, {
        foreignKey: "conversationId",
        as: "conversation",
      });
    }
  }

  SpeakerAnalysisResult.init(
    {
      conversationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      speakerLabel: {
        type: DataTypes.STRING, // speaker00, speaker01
        allowNull: false,
      },

      role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "unknown",
      },

      sentiment: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      emotion: {
        type: DataTypes.STRING,
      },

      score: {
        type: DataTypes.FLOAT,
      },

      voiceTone: {
        type: DataTypes.STRING,
      },

      emotionDetail: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      confidence: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },

      processingTime: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "SpeakerAnalysisResult",
      tableName: "SpeakerAnalysisResults",
      timestamps: true,
    },
  );

  return SpeakerAnalysisResult;
};
