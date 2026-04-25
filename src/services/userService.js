import db from "../models/index.js";
import bcrypt from "bcryptjs";

const salt = bcrypt.genSaltSync(10);

const checkUserEmail = async (email) => {
  const user = await db.User.findOne({ where: { email } });
  return !!user;
};

const handleUserLogin = async (email, password) => {
  try {
    const user = await db.User.findOne({
      where: { email },
      raw: true,
    });

    if (!user) {
      return {
        errCode: 1,
        errMessage: "Email không tồn tại",
      };
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return {
        errCode: 2,
        errMessage: "Sai mật khẩu",
      };
    }

    delete user.password;

    return {
      errCode: 0,
      errMessage: "Đăng nhập thành công",
      user,
    };
  } catch (e) {
    throw e;
  }
};

const getAllUsers = async () => {
  return await db.User.findAll({
    attributes: { exclude: ["password"] },
  });
};

const createNewUser = async (data) => {
  const isExist = await checkUserEmail(data.email);
  if (isExist) {
    return {
      errCode: 1,
      errMessage: "Email đã tồn tại",
    };
  }

  const hashPassword = await bcrypt.hash(data.password, salt);

  await db.User.create({
    email: data.email,
    password: hashPassword,
    fullName: data.fullName,
    role: data.role || "USER",
    image: data.image || null,
    status: "ACTIVE",
  });

  return {
    errCode: 0,
    errMessage: "Tạo user thành công",
  };
};

const deleteUser = async (userId) => {
  const user = await db.User.findByPk(userId);
  if (!user) {
    return {
      errCode: 1,
      errMessage: "User không tồn tại",
    };
  }

  await db.User.destroy({ where: { id: userId } });

  return {
    errCode: 0,
    errMessage: "Xóa user thành công",
  };
};

const updateUserData = async (data) => {
  if (!data.id) {
    return {
      errCode: 1,
      errMessage: "Thiếu id user",
    };
  }

  const user = await db.User.findByPk(data.id);
  if (!user) {
    return {
      errCode: 2,
      errMessage: "User không tồn tại",
    };
  }

  await db.User.update(
    {
      fullName: data.fullName,
      image: data.image ?? user.image,
      role: data.role,
      status: data.status,
    },
    {
      where: { id: data.id },
    },
  );

  return {
    errCode: 0,
    errMessage: "Cập nhật user thành công",
  };
};

const getUserById = async (userId) => {
  const user = await db.User.findByPk(userId, {
    attributes: { exclude: ["password"] },
  });

  if (!user) {
    return {
      errCode: 1,
      errMessage: "User không tồn tại",
    };
  }

  return {
    errCode: 0,
    user,
  };
};

export {
  handleUserLogin,
  getAllUsers,
  createNewUser,
  deleteUser,
  updateUserData,
  getUserById,
};
