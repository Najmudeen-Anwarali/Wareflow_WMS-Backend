import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import logAction from "../utility/logAction.js";
import ExcelJS from "exceljs";

//CREATE SALE
export const createSale = async (req, res) => {
  try {
    const { products, paymentMethod } = req.body;

    // Validate products
    if (!products || !products.length) {
      return res.status(400).json({
        message: "Atleast one product is required",
      });
    }

    // Generate a unique bill number
    const lastSale = await Sale.findOne().sort({ createdAt: -1 });
    const lastNumber = lastSale ? parseInt(lastSale.billNo.split("-")[1]) : 0;
    const billNo = `Bill-${(lastNumber + 1).toString().padStart(5, "0")}`;

    let totalAmount = 0;
    let productDetails = [];

    for (const { qrCode, quantity } of products) {
      const product = await Product.findOne({ qrCode });

      if (!product) {
        return res.status(400).json({
          message: `Product with QR Code '${qrCode}' not found.`,
        });
      }

      if (product.quantity < quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${product.name}. Only ${product.quantity} left.`,
        });
      }

      const total = product.sellingPrice * quantity;
      totalAmount += total;

      productDetails.push({
        productId: product._id,
        name: product.name,
        qrCode: product.qrCode,
        price: product.sellingPrice,
        quantity,
        total,
      });
    }

    // Create the Sale
    const newSale = await Sale.create({
      billNo,
      products: productDetails,
      totalAmount,
      paymentMethod,
      cashier: {
        userId: req.user.id,
        username: req.user.username,
      },
    });

    //Stock deducts from Products
    for (const { qrCode, quantity } of products) {
      await Product.findOneAndUpdate(
        {
          qrCode,
        },
        { $inc: { quantity: -quantity, soldQty: quantity } }
      );
    }

    // Remove productId and _id fields from the products array
    // const productsWithoutIds = newSale.products.map((product) => {
    //   const { productId, _id, ...rest } = product;
    //   return rest;
    // });

    // Log Action (for staff and cashier)
    if (req.user && req.user.role === "cashier") {
      await logAction(req.user, "sales", "Create Sale", {
        billNo: newSale.billNo,
        totalAmount: newSale.totalAmount,
        paymentMethod: newSale.paymentMethod,
      });
    }

    // Send Response
    return res.status(201).json({
      billNo: newSale.billNo,
      date: newSale.date,
      // products: productsWithoutIds,
      products: newSale.products,
      totalAmount: newSale.totalAmount,
      paymentMethod: newSale.paymentMethod,
      cashier: newSale.cashier.username,
    });
  } catch (error) {
    console.log(`Error in createSale (saleController.js): ${error.message}`);
    return res.status(500).json({
      error: error.message,
    });
  }
};

//VIEW SALES
export const viewSales = async (req, res) => {
  try {
    const sales = await Sale.find()
      .select(
        "-createdAt -updatedAt -cashier.userId -_id -__v -products.productId -products._id"
      )
      .sort({ createdAt: -1 });
    if (!sales) {
      return res.status(404).json({
        message: "Sales are not found",
      });
    }
    return res.status(200).json({
      sales,
    });
  } catch (error) {
    console.log(`Error in viewSales (saleController.js): ${error.message}`);
    return res.status(500).json({
      error: error.message,
    });
  }
};

//VIEW SINGLE SALE
export const viewSingleSale = async (req, res) => {
  try {
    const { billNo } = req.params;
    const sale = await Sale.findOne({ billNo }).select(
      "-createdAt -updatedAt  -_id -__v -products.productId -products._id -cashier.userId"
    );
    if (!sale) {
      return res.status(404).json({
        message: "Sale is not found",
      });
    }

    return res.status(200).json({
      sale,
    });
  } catch (error) {
    console.log("Error in viewSingleSale (saleController.js): ", error.message);
    return res.status(500).json({
      error: error.message,
    });
  }
};

//SEARCH SALES
export const searchSales = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({
        message: "Search query is required",
      });
    }
    const sales = await Sale.find({
      $or: [
        { billNo: { $regex: query, $options: "i" } },
        { "products.qrCode": { $regex: query, $options: "i" } },
        { "cashier.username": { $regex: query, $options: "i" } },
        { paymentMethod: { $regex: query, $options: "i" } },
        ...(!isNaN(query) ? [{ totalAmount: parseFloat(query) }] : []),
      ],
    }).select(
      "-createdAt -updatedAt  -_id -__v -products.productId -products._id -cashier.userId"
    );

    if (!sales.length) {
      return res.status(404).json({ message: "No matching sales found" });
    }
    return res.status(200).json({ sales });
  } catch (error) {
    console.log(`Error in searchSales (saleController.js): ${error.message}`);
    return res.status(500).json({
      error: error.message,
    });
  }
};

//UPDATE SALE
export const updateSale = async (req, res) => {
  try {
    const { billNo } = req.params;
    const updateData = req.body;
    delete updateData.billNo;

    const sale = await Sale.findOneAndUpdate({ billNo }, updateData, {
      new: true,
    }).select(
      "-createdAt -updatedAt  -_id -__v -products.productId -products._id -cashier.userId"
    );

    if (!sale) {
      return res.status(404).json({
        message: "Sale not found",
      });
    }

    if (req.user && req.user.role === "cashier") {
      await logAction(req.user, "sales", "Update sale", {
        billNo: sale.billNo,
        reason: "Extra quantities added",
      });
    }
    return res.status(200).json({
      sale,
    });
  } catch (error) {
    console.log(`Error in updateSale (saleController.js): ${error.message}`);
    return res.status(500).json({
      error: error.message,
    });
  }
};

//REPORTS WITH FILTERS
export const salesReport = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      cashier,
      product,
      qrCode,
      minTotal,
      maxTotal,
      paymentMethod,
    } = req.query;

    let filter = {};

    if (cashier) {
      filter["staff.userId.username"] = cashier;
    }
    if (product) {
      filter["products.name"] = { $regex: product, $options: "i" };
    }
    if (qrCode) {
      filter["products.qrCode"] = qrCode;
    }
    if (startDate && endDate) {
      filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (paymentMethod) {
      filter.paymentMethod = { $regex: paymentMethod, $options: "i" };
    }
    if (minTotal || maxTotal) {
      filter.billTotal = {};
      if (minTotal) filter.billTotal.$gte = parseFloat(minTotal);
      if (maxTotal) filter.billTotal.$lte = parseFloat(maxTotal);
    }
    const sales = await Sale.find(filter)
      .select('"cashier.username" -_id')
      .populate("products.productId", "name qrCode -_id")
      .sort({ createdAt: -1 })
      .lean();

    if (!sales.length) {
      return res.status(404).json({
        messsage: "No sales data find for the applied filters",
      });
    }
    return res.status(200).json({
      sales,
    });
  } catch (error) {
    console.log("Error in salesReport (saleController.js):", error.message);
    return res.status(500).json({
      error: error.message,
    });
  }
};

//EXPORT TO EXCEL (RAW DATA (UNFILTERED))
export const exportSalesReport = async (req, res) => {
  try {
    // Fetch all sales without filters
    const sales = await Sale.find()
      .populate("cashier.userId", "username")
      .populate("products.productId", "name qrCode")
      .sort({ createdAt: -1 })
      .lean();

    if (!sales.length) {
      return res.status(404).json({
        message: "No sales data available for export",
      });
    }

    // Create a new Excel workbook & worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Sales_Report");

    // Define columns
    worksheet.columns = [
      { header: "Bill No", key: "billNo", width: 10 },
      { header: "Date", key: "date", width: 25 },
      { header: "Creadted By", key: "cashier", width: 15 },
      { header: "Product Name", key: "name", width: 25 },
      { header: "QR Code", key: "qrCode", width: 20 },
      { header: "Quantity", key: "quantity", width: 10 },
      { header: "Price", key: "price", width: 15 },
      { header: "Total", key: "total", width: 15 },
      { header: "Total Amount", key: "totalAmount", width: 15 },
      { header: "Payment Method", key: "paymentMethod", width: 20 },
    ];

    // Style the header row
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, size: 12 };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    // Add sales data
    sales.forEach((sale) => {
      let firstRow = worksheet.rowCount + 1;
      let firstEntry = true;
      sale.products.forEach((product) => {
        worksheet.addRow({
          billNo: sale.billNo,
          date: new Date(sale.createdAt).toLocaleString(),
          cashier: sale.cashier?.userId?.username || "Admin",
          name: product.productId?.name || "N/A",
          qrCode: product.productId?.qrCode || "N/A",
          quantity: product.quantity || 0,
          price: product.price.toFixed(2) || "0.00",
          total: product.total.toFixed(2) || "0.00",
          totalAmount: firstEntry ? sale.totalAmount.toFixed(2) : "",
          paymentMethod: sale.paymentMethod || "N/A",
        });

        firstEntry = false;
      });

      // Merge Bill No, Date, Cashier, and Total Amount for better visibility
      if (sale.products.length > 1) {
        worksheet.mergeCells(`A${firstRow}:A${worksheet.rowCount}`); // Bill No
        worksheet.mergeCells(`B${firstRow}:B${worksheet.rowCount}`); // Date
        worksheet.mergeCells(`C${firstRow}:C${worksheet.rowCount}`); // Created By
        worksheet.mergeCells(`I${firstRow}:I${worksheet.rowCount}`);
        worksheet.mergeCells(`J${firstRow}:J${worksheet.rowCount}`);
      }

      // Add an empty row after each sale
      worksheet.addRow({});
    });

    // Set response headers
    const filename = "Sales_Report.xlsx";
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

    // Write to the response stream
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error("Error exporting sales report:", error);
    res
      .status(500)
      .json({ message: "Error exporting sales report", error: error.message });
  }
};
