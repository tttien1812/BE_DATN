import db from "../models/index.js";

const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const getRandomDateInCurrentMonth = () => {
  const now = new Date();
  const date = new Date(
    now.getFullYear(),
    now.getMonth(),
    randomInt(1, now.getDate()),
  );

  date.setHours(randomInt(8, 18));
  date.setMinutes(randomInt(0, 59));
  date.setSeconds(randomInt(0, 59));

  return date;
};

const seedDemoConversations = async () => {
  const transaction = await db.sequelize.transaction();

  try {
    console.log("===== SEED DEMO CONVERSATIONS =====");

    const demoUsers = await db.User.findAll({
      where: {
        email: {
          [db.Sequelize.Op.like]: "%.demo@voxsence.com",
        },
      },
      transaction,
    });

    if (!demoUsers.length) {
      throw new Error(
        "Không tìm thấy user demo. Hãy chạy seedDemoUsers.js trước.",
      );
    }

    for (const user of demoUsers) {
      const conversationCount = randomInt(8, 14);

      for (let i = 1; i <= conversationCount; i++) {
        const createdAt = getRandomDateInCurrentMonth();
        const updatedAt = new Date(
          createdAt.getTime() + randomInt(30, 180) * 1000,
        );

        await db.Conversation.create(
          {
            userId: user.id,
            audioUrl: `uploads/demo-audio-user-${user.id}-${i}.ogg`,
            status: "done",
            createdAt,
            updatedAt,
          },
          { transaction },
        );
      }
    }

    await transaction.commit();

    console.log("✅ Tạo conversation demo thành công");
    process.exit(0);
  } catch (error) {
    await transaction.rollback();

    console.error("❌ Tạo conversation demo thất bại:", error);
    process.exit(1);
  }
};

seedDemoConversations();
