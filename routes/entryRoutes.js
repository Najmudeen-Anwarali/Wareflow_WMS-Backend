import express from "express";
import {
  createEntry,
  deletedEntries,
  deleteEntry,
  entryReport,
  exportEntryReport,
  recoverEntry,
  searchEntries,
  singleEntry,
  softDeleteEntry,
  updateEntry,
  viewEntries,
} from "../controllers/entryController.js";
import { adminOnly, protect, staffOrAdmin } from "../middleware/isAuth.js";

const router = express.Router();

router.post("/entry/add", protect, staffOrAdmin, createEntry);
router.get("/entry/view", protect, staffOrAdmin, viewEntries);
router.get("/entry/:entryNo", protect, staffOrAdmin, singleEntry);
router.get("/entries/search", protect, staffOrAdmin, searchEntries);
router.put("/entry/:entryNo", protect, staffOrAdmin, updateEntry);
router.put("/entry/delete/:entryNo", protect, staffOrAdmin, softDeleteEntry);
router.get("/entries/deleted", protect, staffOrAdmin, deletedEntries);
router.put("/entry/recover/:entryNo", protect, staffOrAdmin, recoverEntry);
router.delete("/entry/:entryNo", protect, adminOnly, deleteEntry);
router.get("/entries/:report", protect, staffOrAdmin, entryReport);
router.get("/report/export", protect, staffOrAdmin, exportEntryReport);

export default router;
