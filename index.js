import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./database/db.js";
// import billRoutes from "./routes/bill.js";
import adminRoutes from "./routes/adminRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import entryRoutes from "./routes/entryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import { scheduleAlerts } from "./controllers/alertController.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import saleRoutes from "./routes/saleRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";

const app = express();
dotenv.config();
const port = process.env.PORT || 5000;
scheduleAlerts();

app.use(
  cors({
    origin: "http://localhost:5173", // Frontend URL
    credentials: true, // Allow cookies or credentials
  })
);
app.use(express.json());
app.use(cookieParser());

// app.use("/api", billRoutes);
app.use("/api", adminRoutes);
app.use("/api", userRoutes);
app.use("/api", entryRoutes);
app.use("/api", productRoutes);
app.use("/api", supplierRoutes);
app.use("/api", saleRoutes);
app.use("/api", reportRoutes);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  connectDB();
});
