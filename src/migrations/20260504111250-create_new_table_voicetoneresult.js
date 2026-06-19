// migrations/xxxx-create-speaker-tone-results.js
"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("VoiceToneResults", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },

      conversationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Conversations",
          key: "id",
        },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },

      speakerLabel: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      toneEmotion: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      toneScore: {
        type: Sequelize.FLOAT,
        allowNull: false,
      },

      toneSentiment: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      toneConfidence: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },

      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },

      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    // 🔥 index để query nhanh
    await queryInterface.addIndex("VoiceToneResults", ["conversationId"]);

    await queryInterface.addIndex("VoiceToneResults", ["speakerLabel"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("VoiceToneResults");
  },
};
