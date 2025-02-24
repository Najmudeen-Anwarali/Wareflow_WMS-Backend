import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
  {
    supplierName: {
      type: String,
      required: true,
      trim: true,
    },
    supplierCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    address: {
      street: {
        type: String,
        default: "",
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      pincode: {
        type: String,
        default: "",
      },
    },
    contact: {
      phone: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        default: "",
      },
    },
    billNumbers: [
      {
        billNo: {
          type: String,
          required: true,
        },
        entryNo: {
          type: String,
          required: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Supplier", supplierSchema);
