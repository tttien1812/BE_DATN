"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn("AnalysisResults", "voiceTone");
    await queryInterface.removeColumn("AnalysisResults", "emotionDetail");
    await queryInterface.removeColumn("AnalysisResults", "processingTime");
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("AnalysisResults", "voiceTone", {
      type: Sequelize.STRING,
    });
    await queryInterface.addColumn("AnalysisResults", "emotionDetail", {
      type: Sequelize.JSON,
    });
    await queryInterface.addColumn("AnalysisResults", "processingTime", {
      type: Sequelize.FLOAT,
    });
  },
};