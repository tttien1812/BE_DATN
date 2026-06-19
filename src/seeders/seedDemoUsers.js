import bcrypt from "bcryptjs";
import db from "../models/index.js";

const demoUsers = [
  {
    email: "minh.anh.demo@voxsence.com",
    fullName: "Nguyễn Minh Anh",
  },
  {
    email: "hoang.nam.demo@voxsence.com",
    fullName: "Trần Hoàng Nam",
  },
  {
    email: "thu.ha.demo@voxsence.com",
    fullName: "Lê Thu Hà",
  },
  {
    email: "quoc.huy.demo@voxsence.com",
    fullName: "Phạm Quốc Huy",
  },
  {
    email: "ngoc.linh.demo@voxsence.com",
    fullName: "Đỗ Ngọc Linh",
  },
  {
    email: "thanh.tung.demo@voxsence.com",
    fullName: "Võ Thanh Tùng",
  },
  {
    email: "khanh.vy.demo@voxsence.com",
    fullName: "Bùi Khánh Vy",
  },
  {
    email: "duc.hai.demo@voxsence.com",
    fullName: "Trương Đức Hải",
  },
  {
    email: "gia.han.demo@voxsence.com",
    fullName: "Nguyễn Gia Hân",
  },
  {
    email: "quoc.bao.demo@voxsence.com",
    fullName: "Lê Quốc Bảo",
  },
];

const seedDemoUsers = async () => {
  const transaction = await db.sequelize.transaction();

  try {
    const hashedPassword = await bcrypt.hash("123456", 10);

    for (const user of demoUsers) {
      await db.User.findOrCreate({
        where: {
          email: user.email,
        },
        defaults: {
          email: user.email,
          password: hashedPassword,
          fullName: user.fullName,
          image: null,
          role: "USER",
          status: "ACTIVE",
          // lastLoginAt không cần truyền, DB sẽ tự để NULL
        },
        transaction,
      });
    }

    await transaction.commit();

    console.log("✅ Tạo user demo thành công");
    console.log("Mật khẩu chung: 123456");

    process.exit(0);
  } catch (error) {
    await transaction.rollback();

    console.error("❌ Tạo user demo thất bại:", error);
    process.exit(1);
  }
};

seedDemoUsers();
