"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("VoiceToneResults", "role", {
      type: Sequelize.STRING,
      allowNull: true, // cho phép null để không crash data cũ
      after: "speakerLabel", // optional (MySQL only)
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("VoiceToneResults", "role");
  },
};
