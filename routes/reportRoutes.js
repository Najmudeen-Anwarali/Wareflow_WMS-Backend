import express from "express";
import {
    combinedReport,
  //   exportCombinedReport,
} from "../controllers/combinedReportController.js";
import { protect, staffOrAdmin } from "../middleware/isAuth.js";

const router = express.Router();

router.get("/report/combined", protect, staffOrAdmin, combinedReport);

// router.get("/report/combined/export", protect, staffOrAdmin, exportCombinedReport);

export default router;
