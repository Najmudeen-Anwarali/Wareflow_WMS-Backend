import Product from "../models/Product.js";
import User from "../models/User.js";
import Entry from "../models/Entry.js";
import ExcelJS from "exceljs";
// import Sale from "../models/Sale.js";
import logAction from "../utility/logAction.js";

//VIEW PRODUCTS
export const viewProducts = async (req, res) => {
  try {
    const products = await Product.find()
      .select(" -_id name quantity qrCode sellingPrice entryNo  ")
      .sort({ createdAt: -1 });
    if (!products) {
      return res.status(404).json({
        message: "Products are not found",
      });
    }
    return res.status(200).json({
      products,
    });
  } catch (error) {
    console.log(
      `Error in viewProducts (productController.js): ${error.message}`
    );
    return res.status(500).json({
      error: error.message,
    });
  }
};

//SINGLE PRODUCT
export const singleProduct = async (req, res) => {
  try {
    const { qrCode } = req.params;
    const product = await Product.findOne({ qrCode }).select(
      "-_id -qrCodeImage -createdAt -updatedAt -__v"
    );
    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }
    return res.status(200).json({ product });
  } catch (error) {
    console.log(
      `Error in singleProduct (productController.js): ${error.message}`
    );
    return res.status(500).json({
      error: error.message,
    });
  }
};

//SEARCH PRODUCTS WITH SUGGESTIONS
export const searchProducts = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({
        message: "Search query is required",
      });
    }
    const products = await Product.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
        { qrCode: { $regex: query, $options: "i" } },
        { shelf: { $regex: query, $options: "i" } },
        { entryNo: { $regex: query, $options: "i" } },
      ],
    }).select("name category qrCode quantity shelf sellingPrice entryNo");

    if (!products.length) {
      return res.status(404).json({ message: "No matching products found" });
    }
    return res.status(200).json({ products });
  } catch (error) {
    console.log(
      `Error in searchProducts (productController.js): ${error.message}`
    );
    return res.status(500).json({
      error: error.message,
    });
  }
};

//UPDATE PRODUCT
export const updateProduct = async (req, res) => {
  try {
    const { qrCode } = req.params;
    const update = req.body;
    delete update.qrCode;
    delete update.entryNo;
    delete update.quantity;
    const updatedProduct = await Product.findOneAndUpdate({ qrCode }, update, {
      new: true,
    }).select("-_id -qrCodeImage -createdAt -updatedAt -__v");
    if (!updatedProduct) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    if (req.user && req.user.role === "staff") {
      await logAction(req.user, "product", "Update Product", {
        productName: updatedProduct.name,
        qrCode: updatedProduct.qrCode,
      });
    }

    return res.status(200).json({
      message: "Product updates successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.log(
      `Error in updateProduct (productController.js): ${error.message}`
    );
    return res.status(500).json({
      error: error.message,
    });
  }
};

//DELETE PRODUCT PERMANENTLY
export const deleteProduct = async (req, res) => {
  try {
    const { qrCode } = req.params;
    const deletedProduct = await Product.findOneAndDelete({ qrCode });
    if (!deletedProduct) {
      return res.status(404).json({
        message: "Product not found",
      });
    }
    return res.status(200).json({
      message: "Product deleted permanently",
    });
  } catch (error) {
    console.log(
      `Error in deleteProduct (productController.js): ${error.message}`
    );
    return res.status(500).json({
      error: error.message,
    });
  }
};

//STOCK ADJUSTMENT
export const adjustStock = async (req, res) => {
  try {
    const { qrCode } = req.params;
    const { adjustmentType, quantity, reason } = req.body;

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        message: "Quantity must be a valid positive number",
      });
    }

    const adjType = adjustmentType.toLowerCase();
    if (!["increase", "decrease"].includes(adjType)) {
      return res.status(400).json({
        message: "Invalid adjustment type. Must be 'increase' or 'decrease'.",
      });
    }

    if (!reason) {
      return res.status(400).json({
        message: "Reason is required",
      });
    }

    const product = await Product.findOne({ qrCode }).select(
      " -createdAt -updatedAt -__v -qrCodeImage"
    );
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const newQuantity =
      adjType === "increase" ? product.quantity + qty : product.quantity - qty;

    if (newQuantity < 0) {
      return res.status(400).json({ message: "Stock cannot be negative." });
    }

    product.quantity = newQuantity;
    await product.save();

    if (req.user && req.user.role === "staff") {
      await logAction(req.user, "stock", `${adjType} stock`, {
        productName: product.name,
        qrCode: product.qrCode,
        adjustmentType: adjType,
        quantityChanged: qty,
        reason,
      });
    }

    return res.status(200).json({
      message: `Stock ${adjType}d successfully`,
      quantity: qty,
      updatedQuantity: product.quantity,
      product,
    });
  } catch (error) {
    console.log(
      `Error in adjustStock (productController.js): ${error.message}`
    );
    return res.status(500).json({
      error: error.message,
    });
  }
};

//PRODUCT HISTORY
export const productHistory = async (req, res) => {
  try {
    const { qrCode } = req.params;

    //1. Find Product
    const product = await Product.findOne({ qrCode }).select(
      "-__v -createdAt -updatedAt -_id -qrCodeImage"
    );
    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    //2️. Fetch Entry History
    const entry = await Entry.findOne({ "products.qrCode": qrCode }).select(
      "entryNo date supplierName supplierCode supplierBillNo products.$ -_id"
    );
    if (!entry) {
      return res
        .status(404)
        .json({ message: "Entry not found for this product" });
    }

    const productEntry = entry.products.find((p) => p.qrCode === qrCode);
    const costPerUnit = productEntry ? productEntry.purchasePrice : 0;

    //3. Fetch Sales revenue
    const totalRevenue = product.soldQty * product.sellingPrice;

    //4. Calculate Gross Profit (Revenue - Cost)
    const actualCostForSoldQty = costPerUnit * product.soldQty;
    const grossProfit = totalRevenue - actualCostForSoldQty;

    //5. Fetch Stock Adjustment History
    const stockAdjustments = await User.find({
      "actions.type": "stock",
      "actions.details.qrCode": qrCode,
    })
      .select("username actions -_id")
      .lean();
    // console.log(stockAdjustments);

    // console.log(JSON.stringify(stockAdjustments));

    const formattedStockAdjustments = stockAdjustments.flatMap((user) =>
      user.actions
        .filter(
          (action) =>
            action.type === "stock" &&
            action.details.qrCode === qrCode &&
            action.details.quantityChanged !== undefined
        )
        .map((action) => ({
          adjustmentType: action.details.adjustmentType,
          quantityChanged: Number(action.details.quantityChanged),
          performedBy: user.username,
        }))
    );

    // Calculate Total Increase and Decrease Quantities
    const totalIncreaseQty = formattedStockAdjustments
      .filter((adj) => adj.adjustmentType === "increase")
      .reduce((total, adj) => total + adj.quantityChanged, 0);

    const totalDecreaseQty = formattedStockAdjustments
      .filter((adj) => adj.adjustmentType === "decrease")
      .reduce((total, adj) => total + adj.quantityChanged, 0);

    const stockIncreaseCost = formattedStockAdjustments
      .filter((adj) => adj.adjustmentType === "increase")
      .reduce((total, adj) => total + adj.quantityChanged * costPerUnit, 0);

    //6️. Calculate Net Profit (Gross Profit - Stock Adjustments)
    const netProfit = grossProfit - stockIncreaseCost;

    return res.status(200).json({
      product: {
        name: product.name,
        category: product.category,
        shelf: product.shelf,
        purchasePrice: product.purchasePrice,
        margin: product.marginPercentage,
        sellingPrice: product.sellingPrice,
        qrCode: product.qrCode,
        quantity: product.quantity,
        lowStock: product.lowStock,
        entryNo: product.entryNo,
        soldQuantity: product.soldQty,
      },
      entryDetails: {
        entryNo: entry.entryNo,
        date: entry.date,
        supplierName: entry.supplierName,
        supplierBillNo: entry.supplierBillNo,
        supplierCode: entry.supplierCode,
      },
      totalRevenue,
      totalCost: actualCostForSoldQty,
      grossProfit,
      // netProfit,
      totalIncreaseQty,
      totalDecreaseQty,
      stockAdjustments: formattedStockAdjustments,
    });
  } catch (error) {
    console.log(
      `Error in productHistory (productController.js): ${error.message}`
    );
    return res.status(500).json({
      error: error.message,
    });
  }
};

//REPORTS WITH FILTERS
export const stockReport = async (req, res) => {
  try {
    const { name, category, entryNo, startDate, endDate, lowStock } = req.query;
    let filter = {};

    // Apply Filters only if any filter is provided
    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }
    if (category) {
      filter.category = { $regex: category, $options: "i" };
    }
    if (entryNo) {
      filter.entryNo = { $regex: entryNo, $options: "i" };
    }
    if (lowStock === "true") {
      filter.$expr = { $lte: ["$quantity", "$lowStock"] };
    }
    if (startDate && endDate) {
      filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    // Fetch all stocks initially or filtered stocks if filters exist
    const stock = await Product.find(filter)
      .select("-__v -updatedAt -qrCodeImage -_id")
      .sort({ createdAt: -1 });

    if (!stock.length) {
      return res
        .status(200)
        .json({ message: "No stock data matches the filters", stock: [] });
    }

    // Fetch distinct values for filters
    const productNames = await Product.distinct("name");
    const categories = await Product.distinct("category");
    const EntryNo = await Product.distinct("entryNo");

    return res.status(200).json({
      stock,
      filterOptions: {
        productNames,
        categories,
        EntryNo,
      },
    });
  } catch (error) {
    console.error("Error in stockReport:", error);
    res.status(500).json({
      message: "Error generating stock report",
      error: error.message,
    });
  }
};

//EXPORT TO EXCEL (RAW DATA (UNFILTERED))
export const exportStockReport = async (req, res) => {
  try {
    const stock = await Product.find()
      .select("-__v -updatedAt _id -qrCodeImage")
      .lean();
    if (!stock.length) {
      return res.status(404).json({
        message: "No stock data found",
      });
    }
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Stock_Report");
    worksheet.columns = [
      { header: "Product Name", key: "name", width: 25 },
      { header: "QR Code", key: "qrCode", width: 15 },
      { header: "Category", key: "category", width: 20 },
      { header: "Stock Quantity", key: "quantity", width: 15 },
      { header: "Low Stock", key: "isLowStock", width: 10 },
      { header: "Sold Quantity", key: "soldQty", width: 15 },
      { header: "Purchase Price", key: "purchasePrice", width: 15 },
      { header: "Selling Price", key: "sellingPrice", width: 15 },
      { header: "Entry Number", key: "entryNo", width: 15 },
      { header: "Shelf", key: "shelf", width: 15 },
      { header: "Created At", key: "createdAt", width: 25 },
    ];

    // Style the header row
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, size: 12 };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    stock.forEach((item) => {
      worksheet.addRow({
        name: item.name,
        qrCode: item.qrCode,
        category: item.category,
        quantity: item.quantity,
        isLowStock: item.quantity <= item.lowStock ? "Yes" : "No",
        soldQty: item.soldQty,
        purchasePrice: item.purchasePrice,
        sellingPrice: item.sellingPrice,
        entryNo: item.entryNo,
        shelf: item.shelf || "Unassigned",
        createdAt: new Date(item.createdAt).toLocaleString(),
      });
    });
    const filename = "Stock_Report.xlsx";
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting stock report:", error);
    res.status(500).json({
      message: "Error exporting stock report",
      error: error.message,
    });
  }
};
