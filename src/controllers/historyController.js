import {
  getHistoryDaysService,
  getHistoryByDateService,
  getHistoryDetailService,
} from "../services/historyService.js";

const getHistoryDaysController = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        errCode: 1,
        errMessage: "Missing userId",
      });
    }

    const result = await getHistoryDaysService(userId);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ errCode: 1 });
  }
};

const getHistoryByDateController = async (req, res) => {
  try {
    const { userId, date } = req.query;

    if (!userId || !date) {
      return res.status(400).json({
        errCode: 1,
        errMessage: "Missing userId or date",
      });
    }

    const result = await getHistoryByDateService(userId, date);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ errCode: 1 });
  }
};

const getHistoryDetailController = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await getHistoryDetailService(id);

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ errCode: 1 });
  }
};

export {
  getHistoryDaysController,
  getHistoryByDateController,
  getHistoryDetailController,
};
