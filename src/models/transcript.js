import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class Transcript extends Model {
    static associate(models) {
      Transcript.belongsTo(models.Conversation, {
        foreignKey: "conversationId",
        as: "conversation",
      });
    }
  }

  Transcript.init(
    {
      conversationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Transcript",
      tableName: "Transcripts",
      timestamps: true,
    },
  );

  return Transcript;
};
