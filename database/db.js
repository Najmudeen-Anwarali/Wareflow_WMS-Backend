import mongoose from "mongoose";
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB);
    console.log("MongoDB Connected Successfully");
  } catch (error) {
    console.error("Error in MongoDB connection:", error);
    process.exit(1);
  }
};

export default connectDB;