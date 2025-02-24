import mongoose from "mongoose";

const entrySchema = new mongoose.Schema(
  {
    entryNo: {
      type: String,
      required: true,
      unique: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    supplierName: {
      type: String,
      required: true,
    },
    supplierBillNo: {
      type: String,
      required: true,
      unique: true,
    },
    supplierCode: {
      type: String,
      required: true,
    },
    creditDaysLimit: {
      type: Number,
      required: true,
    },
    alertTriggered: {
      type: Boolean,
      default: false,
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        name: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
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
        },
      },
    ],
    billTotal: {
      type: Number,
      default: 0,
    },
    discountType: {
      type: String,
      enum: ["percentage", "amount"],
      default: "percentage",
    },
    discountValue: {
      type: Number,
      default: 0,
    },
    finalPayableAmount: {
      type: Number,
      default: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    recoveredAt: {
      type: Date,
      default: null,
    },
    staff: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      username: String,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Entry", entrySchema);
