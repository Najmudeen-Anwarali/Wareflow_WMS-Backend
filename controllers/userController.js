import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// STAFF OR CASHIER LOGIN
export const staffLogin = async (req, res) => {
  const { username, password } = req.body;
  try {
    const staff = await User.findOne({ username });
    if (!staff) return res.status(400).json({ msg: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, staff.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

    const payload = { user: { id: staff.id, role: staff.role} };
    //,username: staff.username 
    const token1 = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE,
    });

    res.cookie("token1", token1, {
      httpOnly: true,
      maxAge: 15 * 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === "production" ? true : false,
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    });

    const { password: userPassword, ...userDetails } = staff.toObject();

    return res.status(200).json({
      message: `Welcome Back ${staff.username}`,
      user: userDetails,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// STAFF OR CASHIER LOGOUT
export const staffLogout = async (req, res) => {
  try {
    // res.cookie("token1", "", { maxAge: 0 });
    res.clearCookie("token1");

    res.status(200).json({ message: "Logout Successfully" });
  } catch (error) {
    console.log(`Error in logoutUser (controllers/user.js): ${error} `);
    return res.status(500).json({ error: error.message });
  }
};
