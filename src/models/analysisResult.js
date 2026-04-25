import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class AnalysisResult extends Model {
    static associate(models) {
      AnalysisResult.belongsTo(models.Conversation, {
        foreignKey: "conversationId",
        as: "conversation",
      });
    }
  }

  AnalysisResult.init(
    {
      conversationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
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
      modelName: "AnalysisResult",
      tableName: "AnalysisResults",
      timestamps: true,
    },
  );

  return AnalysisResult;
};
