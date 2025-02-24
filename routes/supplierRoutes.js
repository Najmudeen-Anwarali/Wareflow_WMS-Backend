import express from "express";
import { adminOnly, protect, staffOrAdmin } from "../middleware/isAuth.js";
import {
  addSupplier,
  deleteSupplier,
  exportSupplierReport,
  searchSuppliers,
  singleSupplier,
  supplierReport,
  updateSupplier,
  viewSupplier,
} from "../controllers/supplierController.js";

const router = express.Router();

router.post("/supplier/add", protect, staffOrAdmin, addSupplier);
router.get("/supplier/view", protect, staffOrAdmin, viewSupplier);
router.get("/supplier/:supplierCode", protect, staffOrAdmin, singleSupplier);
router.get("/suppliers/search", protect, staffOrAdmin, searchSuppliers);
router.put("/supplier/:supplierCode", protect, staffOrAdmin, updateSupplier);
router.delete("/supplier/:supplierCode", protect, adminOnly, deleteSupplier);
router.delete("/supplier/:supplierCode", protect, adminOnly, deleteSupplier);
router.get("/suppliers/report", protect, staffOrAdmin, supplierReport);
router.get("/suppliers/export", protect, staffOrAdmin, exportSupplierReport);

export default router;
