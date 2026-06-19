"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("SpeakerSegments", "toneEmotion", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("SpeakerSegments", "toneScore", {
      type: Sequelize.FLOAT,
      allowNull: true,
    });

    await queryInterface.addColumn("SpeakerSegments", "toneConfidence", {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("SpeakerSegments", "toneConfidence");
    await queryInterface.removeColumn("SpeakerSegments", "toneScore");
    await queryInterface.removeColumn("SpeakerSegments", "toneEmotion");
  },
};
