import express from "express";
import { protect, adminOnly } from "../middleware/isAuth.js";
import {
  adminLogin,
  adminLogout,
  adminRegister,
  adminVerify,
  myProfile,
  staffRegister,
  updateProfile,
  viewLogs,
} from "../controllers/adminController.js";

const router = express.Router();

router.post("/admin/register", adminRegister);
router.post("/admin/verify", adminVerify);
router.post("/admin/login", adminLogin);
router.get("/admin/profile", protect, adminOnly, myProfile);
router.put("/admin/profile", protect, adminOnly, updateProfile);
router.post("/admin/logout", protect, adminOnly, adminLogout);
router.post("/user/register", protect, adminOnly, staffRegister);
router.get("/logs/view", protect, adminOnly, viewLogs);

export default router;
