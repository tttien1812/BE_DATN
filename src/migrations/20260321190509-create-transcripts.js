"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Transcripts", {
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

      content: {
        type: Sequelize.TEXT,
        allowNull: false,
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
    await queryInterface.dropTable("Transcripts");
  },
};
