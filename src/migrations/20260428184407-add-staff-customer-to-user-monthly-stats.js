"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      "UserMonthlyStats",
      "staff",
      {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      }
    );

    await queryInterface.addColumn(
      "UserMonthlyStats",
      "customer",
      {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0,
      }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(
      "UserMonthlyStats",
      "staff"
    );

    await queryInterface.removeColumn(
      "UserMonthlyStats",
      "customer"
    );
  },
};