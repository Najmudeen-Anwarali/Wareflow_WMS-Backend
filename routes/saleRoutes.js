import express from "express";
import { cashierOrAdmin, protect } from "../middleware/isAuth.js";
import {
  createSale,
  exportSalesReport,
  salesReport,
  searchSales,
  updateSale,
  viewSales,
  viewSingleSale,
} from "../controllers/saleController.js";

const router = express.Router();

router.post("/sale/add", protect, cashierOrAdmin, createSale);
router.get("/sales/view", protect, cashierOrAdmin, viewSales);
router.get("/sale/:billNo", protect, cashierOrAdmin, viewSingleSale);
router.get("/sales/search", protect, cashierOrAdmin, searchSales);
router.put("/sale/:billNo", protect, cashierOrAdmin, updateSale);
router.get("/sales/report", protect, cashierOrAdmin, salesReport);
router.get("/sales/export", protect, cashierOrAdmin, exportSalesReport);

export default router;
