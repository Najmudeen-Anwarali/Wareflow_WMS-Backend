import logAction from "../utility/logAction.js";
import Supplier from "../models/Supplier.js";
import ExcelJS from "exceljs";
import fs from "fs";
import path from "path";

//CREATE SUPPLIER
export const addSupplier = async (req, res) => {
  try {
    const { supplierName, supplierCode, city, state, contact } = req.body;

    const regex = /^[A-Z]{4}$/;
    if (!regex.test(supplierCode)) {
      return res.status(400).json({
        error:
          "Invalid Supplier Code. It Must be exactly 4 Uppercase Letters [A-Z]",
      });
    }

    const existingSupplier = await Supplier.findOne({ supplierCode });
    if (existingSupplier) {
      return res.status(400).json({
        error: "Supplier Code Already Exists. Please use a unique code.",
      });
    }
    const supplierName1 = supplierName
      .toUpperCase()
      .replace(/\s*&CO$/i, " & Co");

    const newSupplier = await Supplier.create({
      supplierName: supplierName1,
      supplierCode,
      address: { city, state },
      contact,
    });

    // Log staff action
    if (req.user && req.user.role === "staff") {
      await logAction(req.user, "supplier", "create supplier", {
        supplierName: newSupplier.supplierName,
        supplierCode: newSupplier.supplierCode,
      });
    }

    return res
      .status(201)
      .json({ message: "Supplier Created Succesfully", supplier: newSupplier });
  } catch (error) {
    console.log(`error in addSupplier (supplierController.js): ${error}`);
    return res
      .status(500)
      .json({ message: "error creating supplier", error: error.message });
  }
};

//VIEW ALL SUPPLIERS
export const viewSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.find()
      .select("-createdAt -updatedAt -__v -_id")
      .sort({ createdAt: -1 });

    if (!supplier) {
      return res.status(404).json({
        messsage: "Supplier not found",
      });
    }
    return res.status(200).json({
      supplier,
    });
  } catch (error) {
    console.log(`error in viewSupplier (supplierController.js): ${error}`);
    return res
      .status(500)
      .json({ message: "error to view all suppliers", error: error.message });
  }
};

//VIEW SINGLE SUPPLIER
export const singleSupplier = async (req, res) => {
  try {
    const { supplierCode } = req.params;

    if (!supplierCode) {
      return res.status(400).json({
        message: "Supplier code required",
      });
    }
    const supplier = await Supplier.findOne({ supplierCode }).select(
      "-createdAt -updatedAt -__v -_id"
    );

    if (!supplier) {
      return res.status(404).json({
        message: "Supplier not found",
      });
    }

    return res.status(200).json({
      supplier,
    });
  } catch (error) {
    console.log(`error in singleSupplier (supplierController.js): ${error}`);
    return res
      .status(500)
      .json({ message: "error to view single supplier", error: error.message });
  }
};

//SEARCH SUPPLIERS WITH SUGGESTION
export const searchSuppliers = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({
        message: "Search query is required",
      });
    }
    const suppliers = await Supplier.find({
      $or: [
        { supplierName: { $regex: query, $options: "i" } },
        { supplierCode: { $regex: query, $options: "i" } },
        { "address.city": { $regex: query, $options: "i" } },
        { "address.state": { $regex: query, $options: "i" } },
        { "contact.phone": { $regex: query, $options: "i" } },
      ],
    }).select("-createdAt -updatedAt -__v -_id");

    if (!suppliers.length) {
      return res.status(404).json({ message: "No matching suppliers found" });
    }
    return res.status(200).json({ suppliers });
  } catch (error) {
    console.log(`error in searchSuppliers (supplierController.js): ${error}`);
    return res
      .status(500)
      .json({ message: "error searching supplier", error: error.message });
  }
};

//UPDATE SUPPLIER
export const updateSupplier = async (req, res) => {
  try {
    const { supplierCode } = req.params;
    const updatedData = req.body;
    delete updatedData.supplierCode;

    const supplier = await Supplier.findOneAndUpdate(
      { supplierCode },
      updatedData,
      { new: true }
    ).select("-createdAt -updatedAt -__v -_id");

    if (!supplier) {
      return res.status(404).json({
        message: "Supplier not found",
      });
    }

    if (req.user && req.user.role === "staff") {
      await logAction(req.user, "supplier", "Update supplier", {
        supplierName: supplier.supplierName,
        supplierCode: supplier.supplierCode,
      });
    }

    return res.status(200).json({
      message: "Supplier updated successfully",
      supplier,
    });
  } catch (error) {
    console.log(`error in updateSupplier (supplierController.js): ${error}`);
    return res
      .status(500)
      .json({ message: "error updating supplier", error: error.message });
  }
};

//DELETE SUPPLIER
export const deleteSupplier = async (req, res) => {
  try {
    const { supplierCode } = req.params;
    const deletedSupplier = await Supplier.findOneAndDelete({ supplierCode });
    if (!deletedSupplier) {
      return res.status(404).json({
        message: "Supplier not found",
      });
    }
    return res.status(200).json({
      message: "Supplier deleted permanently",
    });
  } catch (error) {
    console.log(`error in deleteSupplier (supplierController.js): ${error}`);
    return res
      .status(500)
      .json({ message: "error deleting supplier", error: error.message });
  }
};

//REPORTS WITH FILTERS
export const supplierReport = async (req, res) => {
  try {
    const { supplierName, city, state, startdate, enddate } = req.query;
    let filter = {};

    // Apply Filters
    if (supplierName) {
      filter.supplierName = { $regex: supplierName, $options: "i" };
    }
    if (city) {
      filter["address.city"] = { $regex: city, $options: "i" };
    }
    if (state) {
      filter["address.state"] = { $regex: state, $options: "i" };
    }
    if (startdate && enddate) {
      filter.createdAt = { $gte: new Date(startdate), $lte: new Date(enddate) };
    }

    // Fetch Suppliers based on filter
    const suppliers = await Supplier.find(filter)
      .select("-__v -updatedAt -_id ")
      .sort({ createdAt: -1 });

    const supplierNames = await Supplier.distinct("supplierName");
    const cities = await Supplier.distinct("address.city");
    const states = await Supplier.distinct("address.state");

    if (!suppliers.length) {
      return res
        .status(200)
        .json({ message: "No suppliers match the filters", suppliers: [] });
    }

    return res.status(200).json({
      suppliers: suppliers.map((supplier) => ({
        ...supplier.toObject(),
        billNumbers: supplier.billNumbers || [],
      })),
      filterOptions: {
        supplierNames,
        cities,
        states,
      },
    });
  } catch (error) {
    console.error("Error in supplierReport:", error);
    res.status(500).json({
      message: "Error generating supplier report",
      error: error.message,
    });
  }
};

//EXPORT TO EXCEL (RAW DATA (UNFILTERED))
export const exportSupplierReport = async (req, res) => {
  try {
    const suppliers = await Supplier.find().select("-__v -updatedAt").lean();

    if (!suppliers.length) {
      return res.status(404).json({ message: "No suppliers found" });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Supplier Report");

    worksheet.columns = [
      { header: "Supplier Name", key: "supplierName", width: 25 },
      { header: "Supplier Code", key: "supplierCode", width: 15 },
      { header: "City", key: "city", width: 20 },
      { header: "State", key: "state", width: 15 },
      { header: "Phone", key: "phone", width: 15 },
      { header: "Email", key: "email", width: 25 },
      { header: "Bill Numbers", key: "billNumbers", width: 50 },
      { header: "Created At", key: "createdAt", width: 25 },
    ];

    // Style the header row
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, size: 12 };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    suppliers.forEach((supplier) => {
      const billNos =
        supplier.billNumbers
          ?.map(
            (bill) =>
              `Bill No: ${bill.billNo}, Entry No: ${bill.entryNo}, Date: ${
                bill.date.toISOString().split("T")[0]
              }`
          )
          .join("\n") || "N/A";

      worksheet.addRow({
        supplierName: supplier.supplierName,
        supplierCode: supplier.supplierCode,
        city: supplier.address?.city || "N/A",
        state: supplier.address?.state || "N/A",
        phone: supplier.contact?.phone || "N/A",
        email: supplier.contact?.email || "N/A",
        billNumbers: billNos,
        createdAt: new Date(supplier.createdAt).toLocaleString(),
      });
    });

    const filename = "Supplier_Report.xlsx";
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting supplier report:", error);
    res.status(500).json({
      message: "Error exporting supplier report",
      error: error.message,
    });
  }
};
