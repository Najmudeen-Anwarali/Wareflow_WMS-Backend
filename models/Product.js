import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    shelf: {
      type: String,
      default: "Unassigned",
    },
    purchasePrice: {
      type: Number,
      required: true,
    },
    marginPercentage: {
      type: Number,
      required: true,
    },
    sellingPrice: {
      type: Number,
      required: true,
    },
    totalCost: {
      type: Number,
      required: true,
    },
    qrCode: {
      type: String,
      required: true,
      unique: true,
    },
    lowStock: {
      type: Number,
      default: 10,
    },
    entryNo: {
      type: String,
      required: true,
    },
    soldQty: {
      type: Number,
      default: 0,
    },
    qrCodeImage: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Product", productSchema);
