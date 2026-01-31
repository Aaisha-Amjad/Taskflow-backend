//Server entry point
//This file STARTS the express server

const app = require("./app"); //Import the configured express app
const db = require("./config/db"); //Import database connectiion
const { initializeSocket } = require("./config/socket"); //import socket.io setup
const http = require("http"); //Need this to create http server
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

//Start Server with socket.io
const startServer = async () => {
  //step 1 : test databasse
  await testDatabaseConnection();

  //step2 : Create HTTP server (required for socket.io)
  const server = http.createServer(app);

  //step 3 : Initalize socket.io
  const io = initializeSocket(server);

  //make io accessible to routes(for broadcasting events)
  app.set("io", io);

  //step 5: start listening requests
  server.listen(PORT, () => {
    console.log("====================");
    console.log("🚀 TaskFlow Server Started");
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌍 URL: http://localhost:${PORT}`);
    console.log(` 🗄️  Database: Connected`);
    console.log(`🔌 WebSocket: Ready`);
    console.log("===========================");
  });
};

// RUN SERVER
startServer();
