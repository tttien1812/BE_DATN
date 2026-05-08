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
      confidence: {
        type: DataTypes.FLOAT,
        allowNull: true,
      },
      customerScore: { type: DataTypes.FLOAT, allowNull: true },
      staffScore: { type: DataTypes.FLOAT, allowNull: true },
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
