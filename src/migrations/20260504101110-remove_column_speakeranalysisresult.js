"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn(
      "SpeakerAnalysisResults",
      "voiceTone"
    );
    await queryInterface.removeColumn(
      "SpeakerAnalysisResults",
      "emotionDetail"
    );
    await queryInterface.removeColumn(
      "SpeakerAnalysisResults",
      "processingTime"
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      "SpeakerAnalysisResults",
      "voiceTone",
      { type: Sequelize.STRING }
    );
    await queryInterface.addColumn(
      "SpeakerAnalysisResults",
      "emotionDetail",
      { type: Sequelize.JSON }
    );
    await queryInterface.addColumn(
      "SpeakerAnalysisResults",
      "processingTime",
      { type: Sequelize.FLOAT }
    );
  },
};