import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class VoiceToneResult extends Model {
    static associate(models) {
      VoiceToneResult.belongsTo(models.Conversation, {
        foreignKey: "conversationId",
        as: "conversation",
      });
    }
  }

  VoiceToneResult.init(
    {
      conversationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      speakerLabel: {
        type: DataTypes.STRING,
        allowNull: false, // SPEAKER_0 / SPEAKER_1
      },

      toneEmotion: {
        type: DataTypes.STRING,
        allowNull: false, // angry, happy, disgust...
      },

      toneScore: {
        type: DataTypes.FLOAT,
        allowNull: false, // 0 → 1
      },

      toneSentiment: {
        type: DataTypes.STRING,
        allowNull: false, // very_negative → very_positive
      },

      toneConfidence: {
        type: DataTypes.FLOAT,
        allowNull: true, // optional
      },
      role: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "VoiceToneResult",
      tableName: "VoiceToneResults",
      timestamps: true,
    },
  );

  return VoiceToneResult;
};
