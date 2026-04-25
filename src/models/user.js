import { Model } from "sequelize";

export default (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Conversation, {
        foreignKey: "userId",
      });
    }
  }

  User.init(
    {
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      fullName: {
        type: DataTypes.STRING,
      },
      image: {
        type: DataTypes.TEXT,
      },
      role: {
        type: DataTypes.STRING,
        defaultValue: "USER",
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: "ACTIVE",
      },
      lastLoginAt: {
        type: DataTypes.DATE,
      },
    },
    {
      sequelize,
      modelName: "User",
      tableName: "Users",
    },
  );

  return User;
};
