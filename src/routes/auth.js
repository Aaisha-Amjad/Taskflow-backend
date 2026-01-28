//defines 3 auth  endpoints and connects them to controller functions
// Authentication Routes
// Handles user registration, login, and currrent user INfo

const express = require("express");
const router = express.Router(); //create a router(mini-app for /api/auth routes)
const authController = require("../controllers/authController"); //Import controller(we'll create this next)
const authMiddleware = require("../middleware/authMiddleware");

//Routes

//POST /api/auth/register - create new user account
router.post("/register", authController.register);

//POST /api/auth/login - Login and get JWT token
router.post("/login", authController.login);

//GET /api/auth/me - Get current loggedin user info (protected route)
router.get("/me", authController.getCurrentUser);

//Export
//app.js will use this with: app.use(' /api/auth', authRoutes)
module.exports = router;
