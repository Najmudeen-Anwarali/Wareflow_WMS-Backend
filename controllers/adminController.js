import User from "../models/User.js";
import Admin from "../models/Admin.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import sendMail from "../utility/sendEmail.js";
import validator from "validator";

//ADMIN REGISTER
export const adminRegister = async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    if (!validator.isEmail(email)) {
      return res.status(400).json({ error: "Invalid Email Address" });
    }
    if (password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters long",
      });
    }

    if (!validator.isStrongPassword(password)) {
      return res.status(400).json({
        error:
          "Password must contain at least one lowercase letter, one uppercase letter, one number, and one special symbol",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match!",
      });
    }

    let user = await Admin.findOne({ email });
    if (user) {
      return res.status(400).json({
        error: "Admin Email Already Exists!",
      });
    }
    const hashPassword = await bcrypt.hash(password, 12);

    const otp = Math.floor(Math.random() * 1000000);

    const activationToken = jwt.sign(
      { username, email, hashPassword, otp },
      process.env.ACTIVATION_SECRET,
      {
        expiresIn: process.env.ACTIVATION_EXPIRE,
      }
    );

    //Set Cookie for Activation Token
    res.cookie("activationToken", activationToken, {
      httpOnly: true,
      maxAge: 10 * 60 * 1000,
      secure: process.env.NODE_ENV === "production" ? true : false,
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    });
    //send OTP via Email
    try {
      const message = `Hello ${username},\n\nYour OTP for account verification is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nThank you,\n From  WareFlow`;
      await sendMail(email, "Your OTP for Account Verification", message);

      return res.status(200).json({
        message: "OTP Sent to Your Mail",
      });
    } catch (error) {
      console.error("Error sending email:", error);
      return res.status(500).json({ error: "Failed to send OTP" });
    }
  } catch (error) {
    console.log(`Error in registerUser (controllers/Admin.js): ${error} `);
    return res.status(500).json({ error: error.message });
  }
};

//VERIFY ADMIN WITH OTP
export const adminVerify = async (req, res) => {
  try {
    const { otp } = req.body;
    const cookieToken = req.cookies.activationToken;

    // Check if activation token exists
    if (!cookieToken) {
      return res.status(400).json({
        error: "Activation token not found",
      });
    }

    let decodedToken;
    // Decoding and verifying the cookie token
    try {
      decodedToken = jwt.verify(cookieToken, process.env.ACTIVATION_SECRET);

      // Check if token is valid and OTP matches
      if (!decodedToken || decodedToken.otp !== otp) {
        return res.status(400).json({
          error: "Invalid or expired OTP",
        });
      }
    } catch (err) {
      // Handle invalid token or other errors
      return res.status(401).json({
        error: "Invalid or expired token",
      });
    }

    // After successful OTP validation, create new Admin
    const { username, email, hashPassword } = decodedToken;

    try {
      await Admin.create({
        username,
        email,
        password: hashPassword,
      });
    } catch (error) {
      return res.status(500).json({ error: "Failed to create Admin" });
    }

    // Clear the activation token cookie
    res.clearCookie("activationToken");

    // Respond with success
    return res.status(201).json({
      message: "Admin Registered Successfully.",
    });
  } catch (error) {
    console.log(`Error in verifyUser (controllers/Admin.js): ${error}`);
    return res.status(500).json({ error: error.message });
  }
};

//LOGIN ADMIN
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(400).json({ error: "Invalid Credentials" });
    }
    const matchPassword = await bcrypt.compare(password, admin.password);
    if (!matchPassword) {
      return res.status(400).json({ error: "Invalid Credentials" });
    }

    const payload = { user: { id: admin.id, role: admin.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE,
    });

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 15 * 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === "production" ? true : false,
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    });

    const { password: adminPassword, ...userDetails } = admin.toObject();

    return res.status(200).json({
      message: `Welcome Back ${admin.username}`,
      user: userDetails,
    });
  } catch (error) {
    console.log(`Error in verifyUser (controllers/admin.js): ${error} `);
    return res.status(500).json({ error: error.message });
  }
};

//VIEW / MY PROFILE
export const myProfile = async (req, res) => {
  try {
    const admin = await Admin.findById({ _id: req.user.id })
      .select("-password")
      .select("-_id")
      .select("-createdAt")
      .select("-updatedAt")
      .select("-__v");

    return res.status(200).json({
      admin,
    });
  } catch (error) {
    console.log(`Error in myProfile (adminController.js): ${error} `);
    return res.status(500).json({ error: error.message });
  }
};

//UPDATE PROFILE
export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    const admin = await Admin.findByIdAndUpdate(userId, updateData, {
      new: true,
    })
      .select("-password")
      .select("-_id")
      .select("-createdAt")
      .select("-updatedAt")
      .select("-__v");
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.status(200).json({ admin });
  } catch (error) {
    console.log(
      `Error in updateProfile (controllers/adminController.js): ${error} `
    );
    return res.status(500).json({ error: error.message });
  }
};

//ADMIN LOGOUT
export const adminLogout = async (req, res) => {
  try {
    res.cookie("token", "", { maxAge: 0 });
    res.clearCookie("token");
    res.status(200).json({ message: "Logout Successfully" });
  } catch (error) {
    console.log(`Error in adminLogout (controllers/admin.js): ${error} `);
    return res.status(500).json({ error: error.message });
  }
};

//STAFF OR CASHIER REGISTER
export const staffRegister = async (req, res) => {
  const { username, password, role } = req.body;
  const createdBy = req.user.id;

  if (!["staff", "cashier"].includes(role)) {
    return res
      .status(400)
      .json({ message: "Invalid role for staff/cashier creation" });
  }

  try {
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const user = await User.create({ username, password, role, createdBy });
    res.status(201).json({
      message: `${
        role.charAt(0).toUpperCase() + role.slice(1)
      } account created`,
      user: {
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating account", error });
  }
};
//VIEW LOGS
export const viewLogs = async (req, res) => {
  try {
    const logs = await User.find().select("username actions role -_id");
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: "Error fetching logs", error });
  }
};
