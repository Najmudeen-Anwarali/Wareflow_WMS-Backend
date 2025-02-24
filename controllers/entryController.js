import Entry from "../models/Entry.js";
import generateQRCode from "../utility/qrCode.js";
// import User from "../models/User.js";
import Supplier from "../models/Supplier.js";
import Product from "../models/Product.js";
import logAction from "../utility/logAction.js";
import ExcelJS from "exceljs";

//CREATE ENTRY
export const createEntry = async (req, res) => {
  try {
    const {
      supplierName,
      supplierBillNo,
      date,
      supplierCode,
      creditDaysLimit,
      products,
      discountType,
      discountValue,
    } = req.body;

    // Validate required fields
    if (
      !supplierName ||
      !supplierBillNo ||
      !supplierCode ||
      !products?.length
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const supplier = await Supplier.findOne({ supplierCode });
    if (!supplier) {
      return res.status(400).json({
        message: "You need to complete the supplier entry first !",
      });
    }

    // Generate a unique entry number
    const lastEntry = await Entry.findOne().sort({ createdAt: -1 });
    const lastCounter = lastEntry
      ? parseInt(lastEntry.entryNo.split("-")[1])
      : 0;
    const entryNo = `WF-${(lastCounter + 1).toString().padStart(4, "0")}`;

    // Check for duplicate supplierBillNo
    const existingBill = await Entry.findOne({ supplierBillNo });
    if (existingBill) {
      return res
        .status(400)
        .json({ message: "Supplier's Bill Number already exists" });
    }

    let totalBillAmount = 0;

    // Process products

    const processedProducts = await Promise.all(
      products.map(async (product) => {
        const {
          productName,
          quantity,
          purchasePrice,
          marginPercentage,
          sellingPrice,
          category,
          shelf,
          lowStock,
        } = product;

        // Validate required fields
        if (
          !productName ||
          !quantity ||
          !purchasePrice ||
          !marginPercentage ||
          !category
        ) {
          throw new Error("Missing required fields in product data.");
        }
        const qrCode = Math.random().toString(36).slice(-8).toUpperCase();
        const qrCodeImage = await generateQRCode(qrCode).catch(() => "");

        let finalMargin = marginPercentage;
        let finalSellingPrice = sellingPrice;

        if (sellingPrice) {
          finalMargin = ((sellingPrice - purchasePrice) / purchasePrice) * 100;
        } else {
          finalSellingPrice =
            purchasePrice + (purchasePrice * marginPercentage) / 100;
        }

        const totalCost = purchasePrice * quantity;
        totalBillAmount += totalCost;

        const newProduct = await Product.create({
          name: productName,
          quantity,
          category,
          shelf: shelf || "Unassigned",
          purchasePrice,
          marginPercentage: finalMargin,
          sellingPrice: finalSellingPrice,
          totalCost,
          qrCode,
          qrCodeImage,
          lowStock: lowStock || 10,
          entryNo,
        });

        return {
          productId: newProduct._id,
          name: newProduct.name,
          quantity: newProduct.quantity,
          purchasePrice: newProduct.purchasePrice,
          marginPercentage: newProduct.marginPercentage,
          sellingPrice: newProduct.sellingPrice,
          totalCost: newProduct.totalCost,
          qrCode: newProduct.qrCode,
          entryNo: newProduct.entryNo,
        };
      })
    );

    let finalPayableAmount = totalBillAmount;

    // Normalize discountType to lowercase and validate discountValue
    if (discountValue && !isNaN(discountValue)) {
      if (discountType.toLowerCase() === "percentage") {
        finalPayableAmount -= (totalBillAmount * discountValue) / 100;
      } else if (discountType.toLowerCase() === "amount") {
        finalPayableAmount -= discountValue;
      }
    }

    // Ensure finalPayableAmount is not negative
    finalPayableAmount = Math.max(finalPayableAmount, 0);

    const supplierName1 = supplierName
      .toUpperCase()
      .replace(/\s*&CO$/i, " & Co");

    const entry = await Entry.create({
      entryNo,
      date: date || Date.now(),
      supplier: supplier._id,
      supplierName: supplierName1,
      supplierBillNo,
      supplierCode,
      creditDaysLimit,
      products: processedProducts,
      billTotal: totalBillAmount,
      discountType,
      discountValue,
      finalPayableAmount,
      staff: {
        userId: req.user.id,
        username: req.user.username,
      },
    });
    console.log("🔍 Debug req.user:", req.user);

    if (req.user && req.user.role === "staff") {
      await logAction(req.user, "entry", "Create Entry", {
        entryNo: entry.entryNo,
        supplierName: entry.supplierName,
        supplierBillNo: entry.supplierBillNo,
      });
    }
    await Supplier.findOneAndUpdate(
      { supplierCode },
      {
        $push: {
          billNumbers: {
            billNo: supplierBillNo,
            entryNo: entry.entryNo,
            date: new Date(),
          },
        },
      }
    );

    res.status(201).json({ message: "Entry created successfully", entry });
  } catch (error) {
    console.log("Error creating entry:", error);
    res
      .status(500)
      .json({ message: "Error creating entry", details: error.message });
  }
};

//VIEW ENTRIES
export const viewEntries = async (req, res) => {
  try {
    const entries = await Entry.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .select(
        "-createdAt -updatedAt -__v -_id -supplier -products._id -products.productId"
      );
    if (!entries.length) {
      res.status(200).json({ error: "No Entries Found!", entries: [] });
    }
    return res.status(200).json({
      entries,
    });
  } catch (error) {
    console.log(`Error in viewEntries (entryController.js): ${error} `);
    return res.status(500).json({ error: error.message });
  }
};

//SINGLE ENTRY
export const singleEntry = async (req, res) => {
  try {
    const { entryNo } = req.params;
    const entry = await Entry.findOne({ entryNo, isDeleted: false }).select(
      "-createdAt -updatedAt -__v -_id -supplier -products._id -products.productId"
    );

    if (!entry) {
      return res.status(404).json({ message: "Entry not found or Deleted..!" });
    }
    return res.status(200).json({
      entry,
    });
  } catch (error) {
    console.log("Error in singleEntry (entryController.js)", error.message);

    return res.status(500).json({
      error: error.message,
    });
  }
};

//SEARCH ENTRIES WITH SUGGESTIONS
export const searchEntries = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({
        message: "Search query is required",
      });
    }
    const entry = await Entry.find({
      $or: [
        { supplierName: { $regex: query, $options: "i" } },
        { entryNo: { $regex: query, $options: "i" } },
        { billNo: { $regex: query, $options: "i" } },
        { supplierBillNo: { $regex: query, $options: "i" } },
        ...(!isNaN(query) ? [{ creditDaysLimit: parseFloat(query) }] : []),
        ...(!isNaN(query) ? [{ billTotal: parseFloat(query) }] : []),
        // { creditDaysLimit: { $regex: query, $options: "i" } },
        // { billTotal: { $regex: query, $options: "i" } },
      ],
    }).select(
      "-createdAt -updatedAt -__v -_id -supplier -products._id -products.productId"
    );

    if (!entry.length) {
      return res.status(404).json({ message: "No matching entry found" });
    }
    return res.status(200).json({ entry });
  } catch (error) {
    console.log(
      `Error in searchEntries (entryController.js): ${error.message}`
    );
    return res.status(500).json({
      error: error.message,
    });
  }
};

//UPDATE ENTRY
export const updateEntry = async (req, res) => {
  try {
    const { entryNo } = req.params;
    const updateData = req.body;

    // Ensure supplierName is formatted if updated
    if (updateData.supplierName) {
      updateData.supplierName = updateData.supplierName
        .toUpperCase()
        .replace(/\s*&CO$/i, " & Co");
    }

    // Prevent supplierCode from being updated
    delete updateData.supplierCode;
    delete updateData.entryNo;
    delete updateData.products;

    // Find and update the entry
    const updatedEntry = await Entry.findOneAndUpdate(
      { entryNo, isDeleted: false },
      updateData,
      {
        new: true,
      }
    ).select("-createdAt -updatedAt  _id -__v -products.qrCodeImage");

    if (!updatedEntry) {
      return res.status(404).json({ message: "Entry not found or deleted" });
    }

    // Log user action
    if (req.user && req.user.role === "staff") {
      await logAction(req.user, "entry", "Update Entry", {
        entryNo: updatedEntry.entryNo,
        supplierName: updatedEntry.supplierName,
        supplierBillNo: updatedEntry.supplierBillNo,
      });
    }

    res
      .status(200)
      .json({ message: "Entry updated successfully", entry: updatedEntry });
  } catch (error) {
    console.log(`Error in updateEntry: ${error}`);
    return res.status(500).json({ error: error.message });
  }
};

//SOFT-DELETE ENTRY
export const softDeleteEntry = async (req, res) => {
  try {
    const { entryNo } = req.params;
    const entry = await Entry.findOne({ entryNo });

    if (!entry) {
      return res.status(404).json({
        message: "Entry not found ",
      });
    }

    if (entry.isDeleted) {
      return res.status(400).json({
        message: "Entry is already deleted",
      });
    }
    entry.isDeleted = true;
    entry.deletedAt = new Date();
    await entry.save();

    // Log user action
    if (req.user && req.user.role === "staff") {
      await logAction(req.user, "entry", "Delete Entry", {
        entryNo: entry.entryNo,
        supplierName: entry.supplierName,
        supplierBillNo: entry.supplierBillNo,
      });
    }
    return res.status(200).json({
      message: "Entry soft-deleted successfully",
      entry,
    });
  } catch (error) {
    console.log(`Error in softDeleteEntry: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

//VIEW DELETED ENTRIES
export const deletedEntries = async (req, res) => {
  try {
    const entries = await Entry.find({ isDeleted: true }).select(
      "-__v -updatedAt -createdAt -products.productId -_id -products._id -supplier"
    );
    if (!entries || entries.length === 0) {
      return res.status(200).json({
        message: "No Deleted Entries",
        deletedEntries: [],
      });
    }
    return res.status(200).json({
      deletedEntries: entries,
    });
  } catch (error) {
    console.log(`Error in deletedEntries: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

//RECOVER ENTRY
export const recoverEntry = async (req, res) => {
  try {
    // console.log(req.params);

    const { entryNo } = req.params;
    // console.log(`Recovering entry: ${entryNo}`);
    const entry = await Entry.findOne({ entryNo });
    if (!entry) {
      return res.status(404).json({
        message: "Entry not found",
      });
    }
    if (!entry.isDeleted) {
      return res.status(400).json({
        message: "Entry is not deleted",
      });
    }
    entry.isDeleted = false;
    entry.deletedAt = null;
    entry.recoveredAt = new Date();
    await entry.save();

    // Log user action
    if (req.user && req.user.role === "staff") {
      await logAction(req.user, "entry", "Recover Entry", {
        entryNo: entry.entryNo,
        supplierName: entry.supplierName,
        supplierBillNo: entry.supplierBillNo,
      });
    }
    res.status(200).json({ message: "Entry recovered successfully", entry });
  } catch (error) {
    console.log(`Error in recoverEntry: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

//PERMANENT DELETE ENTRY
export const deleteEntry = async (req, res) => {
  try {
    const { entryNo } = req.params;
    const entry = await Entry.findOne({ entryNo });
    if (!entry) {
      return res.status(404).json({
        message: "Entry not found",
      });
    }
    if (!entry.isDeleted) {
      return res
        .status(400)
        .json({ message: "Entry must be soft deleted first" });
    }
    await Entry.findOneAndDelete({ entryNo });
    return res.status(200).json({
      message: "Entry permanenetly deleted",
    });
  } catch (error) {
    console.log(`Error in deleteEntry : ${error}`);
    return res.status(500).json({
      message: error.message,
    });
  }
};

//REPORTS WITH FILTERS
export const entryReport = async (req, res) => {
  try {
    const {
      supplierName,
      dateFrom,
      dateTo,
      minBillAmount,
      maxBillAmount,
      user,
      isDeleted,
      reachedCreditDaysLimit,
    } = req.query;
    let filter = {};

    //Apply Filters
    if (supplierName) {
      filter.supplierName = { $regex: supplierName, $options: "i" };
    }
    if (dateFrom && dateTo) {
      filter.date = { $gte: new Date(dateFrom), $lte: new Date(dateTo) };
    }
    if (minBillAmount || maxBillAmount) {
      filter.billTotal = {};
      if (minBillAmount) filter.billTotal.$gte = parseFloat(minBillAmount);

      if (maxBillAmount) filter.billTotal.$lte = parseFloat(maxBillAmount);
    }
    if (user) {
      filter["staff.username"] = { $regex: user, $options: "i" };
    }
    if (isDeleted === "true") {
      filter.isdeleted = true;
    }
    if (reachedCreditDaysLimit === "true") {
      const now = new Date();
      const creditLimitCondition = {
        $add: [
          "$date",
          { multiply: ["$creditDaysLimit", 24 * 60 * 60 * 1000] },
        ],
      };
      filter.$expr =
        reachedCreditDaysLimit === "true"
          ? { lt: [creditLimitCondition, now] }
          : { $gte: [creditLimitCondition, now] };
    }
    const entries = await Entry.find(filter).sort({ date: -1 });
    return res.status(200).json({ entries });
  } catch (error) {
    console.log("Error in entryReport (entryController.js", error.message);
    return res.status(500).json({
      error: error.message,
    });
  }
};

//EXPORT TO EXCEL (RAW DATA (UNFILTERED))
export const exportEntryReport = async (req, res) => {
  try {
    // Fetch all entries without filters
    const entries = await Entry.find()
      .populate("supplier", "supplierName supplierCode")
      .populate("staff.userId", "username")
      .sort({ createdAt: -1 })
      .lean();

    if (!entries.length) {
      return res.status(404).json({
        message: "No entry data available for export",
      });
    }

    // Create a new Excel workbook & worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Entry_Report");

    // Define columns
    worksheet.columns = [
      { header: "Entry No", key: "entryNo", width: 15 },
      { header: "Supplier Name", key: "supplierName", width: 25 },
      { header: "Supplier Code", key: "supplierCode", width: 15 },
      { header: "Supplier Bill No", key: "supplierBillNo", width: 15 },
      { header: "Date", key: "date", width: 25 },
      { header: "Bill Total", key: "billTotal", width: 15 },
      { header: "Discount Type", key: "discountType", width: 15 },
      { header: "Discount Value", key: "discountValue", width: 15 },
      { header: "Final Payable", key: "finalPayableAmount", width: 15 },
      { header: "Credit Days Limit", key: "creditDaysLimit", width: 15 },
      { header: "isDeleted", key: "isDeleted", width: 10 },
      { header: "Created By", key: "staff", width: 15 },
    ];

    // Style the header row
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, size: 12 };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    // Add rows to the worksheet
    entries.forEach((entry) => {
      worksheet.addRow({
        entryNo: entry.entryNo,
        supplierName: entry.supplier.supplierName || "N/A",
        supplierCode: entry.supplier.supplierCode || "N/A",
        supplierBillNo: entry.supplierBillNo || "N/A",
        date: new Date(entry.date).toLocaleString() || "N/A",
        billTotal: entry.billTotal.toFixed(2) || "0.00",
        discountType: entry.discountType || "N/A",
        discountValue: entry.discountValue || "0",
        finalPayableAmount: entry.finalPayableAmount.toFixed(2) || "0.00",
        creditDaysLimit: entry.creditDaysLimit || "N/A",
        isDeleted: entry.isDeleted ? "Yes" : "No",
        staff: entry.staff?.userId?.username || "Admin",
      });

      // Add an empty row after each sale
      worksheet.addRow({});
    });

    // Set response headers
    const filename = "Entry_Report.xlsx";
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

    // Write to the response stream
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting entry report:", error);
    res
      .status(500)
      .json({ message: "Error exporting entry report", error: error.message });
  }
};
