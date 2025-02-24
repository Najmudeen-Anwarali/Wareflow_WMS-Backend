import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  let token;

  console.log("Cookies:", req.cookies);
  if (req.cookies.token) {
    token = req.cookies.token;
  } else if (req.cookies.token1) {
    token = req.cookies.token1;
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded Token:", decoded);

    let user;
    let role;
    user = await Admin.findById(decoded.user.id).select("-password");
    if (user) {
      role = "admin";
    } else {
      user = await User.findById(decoded.user.id).select("username role");
      if (user) {
        role = user.role;
      }
    }

    if (!user) {
      return res.status(401).json({
        message: "User Not Found",
      });
    }

    req.user = { id: user._id, role: user.role, username: user.username };
    console.log("User authenticated:", req.user);
    next();
  } catch (error) {
    return res.status(401).json({ message: "Token is invalid or expired" });
  }
};

// Admin-only access middleware
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  } else {
    return res.status(403).json({ message: "Forbidden: Admins only" });
  }
};

// Staff or Admin access middleware
export const staffOrAdmin = (req, res, next) => {
  console.log("Checking staffOrAdmin access for:", req.user);
  if (req.user && (req.user.role === "admin" || req.user.role === "staff")) {
    return next();
  } else {
    return res
      .status(403)
      .json({
        message:
          "Forbidden: Access restricted for others besides staff or admin",
      });
  }
};

// Cashier or Admin access middleware
export const cashierOrAdmin = (req, res, next) => {
  console.log("Checking staffOrAdmin access for:", req.user);
  if (req.user && (req.user.role === "admin" || req.user.role === "cashier")) {
    return next();
  } else {
    return res
      .status(403)
      .json({
        message: "Forbidden: Access restricted for others but cashier or admin",
      });
  }
};
