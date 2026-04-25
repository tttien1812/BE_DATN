"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("AnalysisResults", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      conversationId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Conversations",
          key: "id",
        },
        onDelete: "CASCADE",
      },

      sentiment: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      emotion: {
        type: Sequelize.STRING,
        allowNull: true,
      },

      score: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },

      voiceTone: {
        type: Sequelize.STRING,
        allowNull: true,
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("AnalysisResults");
  },
};
