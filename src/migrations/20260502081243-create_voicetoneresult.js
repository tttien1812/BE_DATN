"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("VoiceToneResults", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },

      conversationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Conversations",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },

      toneEmotion: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      toneConfidence: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },

      toneScore: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },

      toneSentiment: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      toneDetail: {
        type: Sequelize.JSON,
        allowNull: true,
      },

      speakerRole: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      speakerLabel: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      processingTime: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },

      modelVersion: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: "cnn_v1",
      },

      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },

      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    // index tăng tốc query dashboard
    await queryInterface.addIndex("VoiceToneResults", ["conversationId"]);
    await queryInterface.addIndex("VoiceToneResults", ["toneEmotion"]);
    await queryInterface.addIndex("VoiceToneResults", ["speakerRole"]);
    await queryInterface.addIndex("VoiceToneResults", ["createdAt"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("VoiceToneResults");
  },
};
