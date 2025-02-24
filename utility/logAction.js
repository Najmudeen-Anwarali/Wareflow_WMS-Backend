import User from "../models/User.js";

const logAction = async (user, type, action, details) => {
  console.log("🔍 user object in logAction:", user);

    if (!user || !user.id) {
      throw new Error("User information is missing");
    }
    // if (user.role === "cashier" && !["sales", "report"].includes(type)) {
    //    console.log("Cashiers can only perform sales and report actions");
    //    return;
    // }
    const userDoc = await User.findById(user.id);
    if (!userDoc) {
      throw new Error("User not found");
    }
    userDoc.actions.push({
      action,
      type,
      date: new Date(),
      details,
      performedBy: user.username,
      role: user.role,
    });
    await userDoc.save();
    console.log(`✅ Logged: ${type} - ${action}`);

};

export default logAction;
