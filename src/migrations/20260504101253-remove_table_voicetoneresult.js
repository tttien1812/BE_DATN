"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.dropTable("VoiceToneResults");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.createTable("VoiceToneResults", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      conversationId: Sequelize.INTEGER,
      toneEmotion: Sequelize.STRING,
      toneConfidence: Sequelize.FLOAT,
      toneScore: Sequelize.FLOAT,
      toneSentiment: Sequelize.STRING,
      speakerLabel: Sequelize.STRING,
      speakerRole: Sequelize.STRING,
      createdAt: Sequelize.DATE,
      updatedAt: Sequelize.DATE,
    });
  },
};