import express from "express";
// import { cashierOrAdmin, protect } from "../middleware/isAuth.js";
import { staffLogin, staffLogout } from "../controllers/userController.js";

const router = express.Router();

router.post('/staff/login',staffLogin);
router.post('/staff/logout',staffLogout);
router.get('/sales/report');

export default router;