"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("SpeakerSegments", "emotion", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.addColumn("SpeakerSegments", "emotionScore", {
      type: Sequelize.FLOAT,
      allowNull: true,
    });

    await queryInterface.addColumn("SpeakerSegments", "emotionConfidence", {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("SpeakerSegments", "emotion");
    await queryInterface.removeColumn("SpeakerSegments", "emotionScore");
    await queryInterface.removeColumn("SpeakerSegments", "emotionConfidence");
  },
};
