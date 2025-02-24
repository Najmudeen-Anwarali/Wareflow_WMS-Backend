📦 Wareflow WMS - Backend
🚀 Overview
Wareflow WMS is a Warehouse Management System (WMS) designed for efficient sales and inventory management. This backend is built using Node.js, Express, and MongoDB to handle stock tracking, sales processing, reporting, and user authentication.
🏗️ Tech Stack
•	Backend: Node.js, Express.js
•	Database: MongoDB (Mongoose ODM)
•	Authentication: JWT & OTP Verification
•	Styling (Frontend): Material UI (MUI)
•	Version Control: Git & GitHub
⚙️ Features
✅ User Authentication (Admin & Cashier)
✅ Role-based Access Control (RBAC)
✅ Sales & Stock Management
✅ QR Code-based Product Scanning
✅ Reports & Data Export (Excel)
✅ Admin Action Logs & Alerts
✅ Dark Mode & Mobile-Friendly UI (Frontend)
________________________________________
🛠️ Installation & Setup
1️⃣ Clone the Repository
git clone https://github.com/Najmudeen-Anwarali/Wareflow_WMS-Backend.git
cd Wareflow_WMS-Backend
2️⃣ Install Dependencies
npm install
3️⃣ Create an .env File
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
OTP_SECRET=your_otp_secret
4️⃣ Start the Server
npm start  # For production
npm run dev  # For development (nodemon enabled)
________________________________________
📌 API Endpoints
🔑 Authentication
Method	Endpoint	Description
POST	/api/auth/register	Register Admin
POST	/api/auth/login	Admin Login
POST	/api/auth/otp-verify	OTP Verification
📦 Product Management
Method	Endpoint	Description
GET	/api/products	Get all products
POST	/api/products	Add a new product
PUT	/api/products/:id	Update a product
DELETE	/api/products/:id	Delete a product
🛒 Sales Management
Method	Endpoint	Description
POST	/api/sales	Create a sale
GET	/api/sales	Get sales history
PUT	/api/sales/cancel/:id	Cancel a sale
📊 Reports
Method	Endpoint	Description
GET	/api/reports/sales	Sales Report
GET	/api/reports/stock	Stock Report
________________________________________
🔐 User Roles
•	Admin: Full control (Sales, Products, Reports, Logs, and User Management)
•	Cashier: Can create sales, view reports, and cancel sales
________________________________________
🚀 Deployment
You can deploy this backend on Render, Heroku, or VPS using:
git push origin main
________________________________________
📝 License
This project is for educational purposes and not intended for production use.
👨‍💻 Developed by Najmudeen Anwarali

