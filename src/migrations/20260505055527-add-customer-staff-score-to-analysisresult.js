"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("AnalysisResults", "customerScore", {
      type: Sequelize.FLOAT,
      allowNull: true,
    });

    await queryInterface.addColumn("AnalysisResults", "staffScore", {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("AnalysisResults", "customerScore");
    await queryInterface.removeColumn("AnalysisResults", "staffScore");
  },
};
