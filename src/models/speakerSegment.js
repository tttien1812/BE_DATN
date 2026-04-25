import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class SpeakerSegment extends Model {
    static associate(models) {
      SpeakerSegment.belongsTo(models.Conversation, {
        foreignKey: "conversationId",
        as: "conversation",
      });
    }
  }

  SpeakerSegment.init(
    {
      conversationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      speaker: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      startTime: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },

      endTime: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },

      text: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "SpeakerSegment",
      tableName: "SpeakerSegments",
      timestamps: true,
    },
  );

  return SpeakerSegment;
};
