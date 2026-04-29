"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("SpeakerAnalysisResults", "role", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "unknown",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("SpeakerAnalysisResults", "role");
  },
};
