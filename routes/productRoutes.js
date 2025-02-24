import express from "express";
import { adminOnly, protect, staffOrAdmin } from "../middleware/isAuth.js";
import {
  adjustStock,
  deleteProduct,
  exportStockReport,
  productHistory,
  searchProducts,
  singleProduct,
  stockReport,
  updateProduct,
  viewProducts,
} from "../controllers/productController.js";

const router = express.Router();

router.get("/products/view", protect, staffOrAdmin, viewProducts);
router.get("/product/:qrCode", protect, staffOrAdmin, singleProduct);
router.get("/products/search", protect, staffOrAdmin, searchProducts);
router.put("/product/:qrCode", protect, staffOrAdmin, updateProduct);
router.delete("/product/:qrCode", protect, adminOnly, deleteProduct);
router.put("/stock/:qrCode", protect, staffOrAdmin, adjustStock);
router.get("/history/:qrCode", protect, staffOrAdmin, productHistory);
router.get("/stocks/report", protect, staffOrAdmin, stockReport);
router.get("/stocks/export", protect, staffOrAdmin, exportStockReport);

export default router;
