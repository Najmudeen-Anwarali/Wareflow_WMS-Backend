import schedule from "node-schedule";
import Admin from "../models/Admin.js";
import Entry from "../models/Entry.js";
import sendMail from "../utility/sendEmail.js";

export const scheduleAlerts = () => {
  schedule.scheduleJob("0 0 * * *", async () => {
    try {
      console.log("Running scheduled job to check credit alerts...");

      // Fetch Admin Email
      const admin = await Admin.findOne();
      if (!admin || !admin.email) {
        console.error(" No admin email found. Aborting job.");
        return;
      }

      const creditAlerts = await Entry.find({
        creditDaysLimit: { $gt: 0 },
        alertTriggered: false,
        $expr: {
          $lte: [
            {
              $subtract: [
                {
                  $add: [
                    "$date",
                    { $multiply: ["$creditDaysLimit", 24 * 60 * 60 * 1000] },
                  ],
                },
                3 * 24 * 60 * 60 * 1000,
              ],
            },
            new Date(),
          ],
        },
      });

      if (creditAlerts.length === 0) {
        console.log("No pending credit alerts found.");
        return;
      }

      //Process Each Entry and Send Email
      for (const entry of creditAlerts) {
        try {
          const message = `The credit limit for\nSupplier:${entry.supplierName},\n Bill No: ${entry.supplierBillNo}\n will expire in 3 days.\n\nThank you,\n\n From  WareFlow`;
          await sendMail(
            admin.email,
            `Credit Alert:${entry.supplierName}`,
            message
          );

          entry.alertTriggered = true;
          await entry.save();

          console.log(
            `Alert sent to ${admin.email} for Supplier: ${entry.supplierName}`
          );
        } catch (emailError) {
          console.error(
            `Failed to send email for Supplier: ${entry.supplierName} - ${emailError.message}`
          );
        }
      }
    } catch (error) {
      console.error(` Error in scheduled job: ${error.message}`);
    }
  });
};
