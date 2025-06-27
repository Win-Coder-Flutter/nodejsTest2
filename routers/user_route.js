const express = require("express");
const router = express.Router();
const user_controller = require("../controllers/user_controller");
const { verifyToken } = require("../middlewares/auth");

router.post("/memberRegister", user_controller.memberRegister);
router.post("/login", user_controller.login);
router.get("/getUsers", verifyToken, user_controller.getAllUser);
router.post("/getSingleUser", verifyToken, user_controller.singleUser);
router.post("/filterByName", verifyToken, user_controller.filterByName);

module.exports = router;
