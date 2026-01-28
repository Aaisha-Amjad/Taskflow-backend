//Express application setup
//This file configures the express app(routes,middleware,etc)

const express = require("express"); //Webframe work for node.js
const cors = require("cors"); //Allows frontend (react, etc) to connect from different port
const dotenv = require("dotenv"); //Load enviroment variables

dotenv.config(); //load variables from .env file
const app = express(); //create express application

//---------------------------
//MIDDLEWARE
//These run BEFORE your route handlers
//Think of them as "security checkpoints" requests pass through
//------------------------------

//1. CORS - Allow requests from frontend (different origin)
app.use(cors());

//2. JSON parser - convert incoming JSON data to javascript objects
//without this, req.body would be undefined
app.use(express.json());

//URL encoded parser - parse form data
app.use(express.urlencoded({ extended: true }));

//--------------------------------------------------
//Basic routes (Just for testing now)
//--------------------------------------------------
app.get("/", (req, res) => {
  res.json({
    message: "🚀 TaskFlow API is running!",
    version: "1.0.0",
    status: "healthy",
  });
});

//API info route
//Access at http://localhost:3000/api
app.get(" /api", (req, res) => {
  res.json({
    message: "TaskFlow API v1.0",
    endpoints: {
      auth: "/api/auth",
      projects: " /api/projects",
      tasks: "/api/tasks",
    },
  });
});

//================================================
// ROUTE IMPORTS (Will add these on Day 2-3)
// ================================================
const authRoutes = require("./routes/auth");
// const projectRoutes = require('./routes/projects');
// const taskRoutes = require('./routes/tasks');

// ================================================
// USE ROUTES (Will uncomment on Day 2-3)
// ================================================
app.use("/api/auth", authRoutes);
// app.use('/api/projects', projectRoutes);
// app.use('/api/tasks', taskRoutes);

// ================================================
// 404 HANDLER
// Catches requests to non-existent routes
// ================================================

app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
  });
});

//====================================================
//  ERROR HANDLER
//  Catches any errors routes
//====================================================

app.use((err, req, res, next) => {
  console.error("❌ Error:", err.message);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

//export
//server.js will import this and start listening

module.exports = app;
