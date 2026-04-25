module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("UserMonthlyStats", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id",
        },
        onDelete: "CASCADE",
      },

      month: {
        type: Sequelize.STRING,
        allowNull: false,
      },

      totalConversations: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
      },

      totalScore: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },

      avgScore: {
        type: Sequelize.FLOAT,
        defaultValue: 0,
      },

      negativeCount: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
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

    await queryInterface.addConstraint("UserMonthlyStats", {
      fields: ["userId", "month"],
      type: "unique",
      name: "unique_user_month",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("UserMonthlyStats");
  },
};
