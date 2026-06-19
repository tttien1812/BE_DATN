import {
  getAdminConversationsService,
  getAdminConversationDetailService,
} from "../services/adminConversationService.js";

const getAdminConversations = async (req, res) => {
  try {
    const data = await getAdminConversationsService(req.query);

    return res.status(200).json(data);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      errCode: 1,
      errMessage: "Internal server error",
    });
  }
};

const getAdminConversationDetail = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        errCode: 1,
        errMessage: "Missing conversation id",
      });
    }

    const response = await getAdminConversationDetailService(id);

    return res.status(200).json(response);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      errCode: 1,
      errMessage: "Server error",
    });
  }
};

export { getAdminConversations, getAdminConversationDetail };
