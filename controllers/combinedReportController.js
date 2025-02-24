import Supplier from "../models/Supplier.js";
import Entry from "../models/Entry.js";
import Product from "../models/Product.js";
import Sale from "../models/Sale.js";

export const combinedReport = async (req, res) => {
  try {
    // Fetch Suppliers
    const suppliers = await Supplier.find()
      .select("supplierName supplierCode address contact createdAt -_id")
      .lean();

    // Fetch Entries (Stock Purchase)
    const entries = await Entry.find()
      .populate("supplier", "supplierName supplierCode")
      .select("entryNo date supplier products billTotal createdAt -_id")
      .lean();

    // Fetch Sales Transactions
    const sales = await Sale.find()
      .populate("cashier.userId", "username")
      .select(
        "billNo date products totalAmount paymentMethod cashier createdAt"
      )
      .lean();

    // Fetch Products with Stock Levels
    const products = await Product.find()
      .select(
        "name qrCode quantity sellingPrice purchasePrice category entryNo"
      )
      .lean();

    //Transform Data into a Single Table Format
    const reportData = [];

    //Add Supplier Data
    suppliers.forEach((supplier) => {
      reportData.push({
        type: "Supplier",
        supplierName: supplier.supplierName,
        supplierCode: supplier.supplierCode,
        city: supplier.address?.city || "N/A",
        state: supplier.address?.state || "N/A",
        phone: supplier.contact?.phone || "N/A",
        email: supplier.contact?.email || "N/A",
        date: new Date(supplier.createdAt).toLocaleString(),
      });
    });

    //Add Entry (Stock Purchase) Data
    entries.forEach((entry) => {
      entry.products.forEach((product) => {
        reportData.push({
          type: "Stock Entry",
          entryNo: entry.entryNo,
          supplierName: entry.supplier?.supplierName || "Unknown",
          supplierCode: entry.supplier?.supplierCode || "Unknown",
          productName: product.name,
          qrCode: product.qrCode,
          quantity: product.quantity,
          purchasePrice: product.purchasePrice,
          totalCost: product.totalCost || 0,
          date: new Date(entry.createdAt).toLocaleString(),
        });
      });
    });

    //Add Sales Data
    sales.forEach((sale) => {
      sale.products.forEach((product) => {
        reportData.push({
          type: "Sale",
          billNo: sale.billNo,
          cashier: sale.cashier?.userId?.username || "Unknown",
          productName: product.name,
          qrCode: product.qrCode,
          quantitySold: product.quantity,
          sellingPrice: product.price,
          totalSale: product.total,
          paymentMethod: sale.paymentMethod,
          date: new Date(sale.date).toLocaleString(),
        });
      });
    });

    //Add Product Stock Levels
    products.forEach((product) => {
      reportData.push({
        type: "Stock Level",
        productName: product.name,
        qrCode: product.qrCode,
        category: product.category,
        availableStock: product.quantity,
        purchasePrice: product.purchasePrice,
        sellingPrice: product.sellingPrice,
        entryNo: product.entryNo,
      });
    });

    //Send Final Consolidated Report
    return res.status(200).json({
      suppliers: reportData.filter((item) => item.type === "Supplier"),
      stockEntries: reportData.filter((item) => item.type === "Stock Entry"),
      sales: reportData.filter((item) => item.type === "Sale"),
      stockLevels: reportData.filter((item) => item.type === "Stock Level"),
    });
  } catch (error) {
    console.error("Error generating combined report:", error);
    res.status(500).json({
      message: "Error generating combined report",
      error: error.message,
    });
  }
};
