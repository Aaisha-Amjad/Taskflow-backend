//Server entry point
//This file STARTS the express server

const app = require("./app"); //Import the configured express app
const db = require("./config/db"); //Import database connectiion
require("dotenv").config(); //load environment variables

//===============================
//PORT configuration
// Use PORT from .env file, or default to 3000
//===============================
const PORT = process.env.PORT || 3000;

//==============================
//Test database connection
//Before starting server, verify database is accessible
//============================
const testDatabaseConnection = async () => {
  try {
    //try a simple query
    await db.query("SELECT NOW()"); //get current timestamp from database
    console.log("✅ Database connection successful");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
};

//Start Server
const startServer = async () => {
  //step 1 : test databasse
  await testDatabaseConnection();

  //step 2: start listening requests
  app.listen(PORT, () => {
    console.log("====================");
    console.log("🚀 TaskFlow Server Started");
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌍 URL: http://localhost:${PORT}`);
    console.log(` 🗄️  Database: Connected`);
    console.log("===========================");
  });
};

// RUN SERVER
startServer();
