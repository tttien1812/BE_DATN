import {
  handleUserLogin,
  getAllUsers,
  createNewUser,
  deleteUser,
  updateUserData,
  getUserById,
} from "../services/userService.js";

const handleLogin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(200).json({
      errCode: 1,
      errMessage: "Thiếu email hoặc password",
    });
  }

  const userData = await handleUserLogin(email, password);
  return res.status(200).json(userData);
};

const handleGetAllUsers = async (req, res) => {
  const users = await getAllUsers();
  return res.status(200).json({
    errCode: 0,
    errMessage: "OK",
    users,
  });
};

const handleCreateNewUser = async (req, res) => {
  const message = await createNewUser(req.body);
  return res.status(200).json(message);
};

const handleDeleteUser = async (req, res) => {
  if (!req.body.id) {
    return res.status(200).json({
      errCode: 1,
      errMessage: "Thiếu id user",
    });
  }

  const message = await deleteUser(req.body.id);
  return res.status(200).json(message);
};

const handleEditUser = async (req, res) => {
  try {
    const data = req.body;

    if (req.file) {
      data.image = req.file.filename;
    }

    const message = await updateUserData(data);
    return res.status(200).json(message);
  } catch (e) {
    return res.status(500).json(e);
  }
};

const handleGetUserById = async (req, res) => {
  const id = req.params.id;
  const data = await getUserById(id);
  return res.status(200).json(data);
};

export {
  handleLogin,
  handleGetAllUsers,
  handleCreateNewUser,
  handleDeleteUser,
  handleEditUser,
  handleGetUserById,
};
