import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class UserMonthlyStats extends Model {
    static associate(models) {
      // 🔥 liên kết với User
      UserMonthlyStats.belongsTo(models.User, {
        foreignKey: "userId",
      });
    }
  }

  UserMonthlyStats.init(
    {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      month: {
        type: DataTypes.STRING, // format: 2026-04
        allowNull: false,
      },

      totalConversations: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },

      totalScore: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },

      avgScore: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },

      negativeCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      staff: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },

      // 🔥 NEW
      customer: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: "UserMonthlyStats",
      tableName: "UserMonthlyStats",
    },
  );

  return UserMonthlyStats;
};
