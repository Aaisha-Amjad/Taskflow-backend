//Authentication controller
//Business logic for regsiter, login, getCurrentUser

const bcrypt = require("bcrypt"); //Password hashing
const jwt = require("jsonwebtoken"); //JWT token creation
const db = require("../config/db"); //Database connection

//Register - create new user account
//POST /api/auth/register
//Body: {email,username,password}

const register = async (req, res) => {
  try {
    const { email, username, password } = req.body; //get data from request

    //1. Validate input (basic check)
    if (!email || !username || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    //2. Check if email already exists
    const userExists = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: "Email already registeredd" });
    }

    //3. Hash password (never store plain text)
    const saltRounds = 10; //How many times to hash (10 is standard)
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    //4. Insert user into database
    const result = await db.query(
      "INSERT INTO users(email, username, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username, created_at",
      [email, username, hashedPassword],
    );

    const newUser = result.rows[0];

    //5. Send success repsonse (dont send password)
    res.status(201).json({
      message: "User registered successfully",
      user: newUser,
    });
  } catch (error) {
    console.error("Registration error:".error);
    console.error("Full error: ", error);
    res.status(500).json({
      error: "Server error during registration ",
      details: error.message,
    });
  }
};

//Login - Authentication user and return JWT token
//POST /api/auth/login
//Body: {email,password}

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    //1.  Validate input
    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required " });
    }

    //2. Find user by email
    const result = await db.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];

    //3. Compare passowrd with hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    //4. Create JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email }, //Payload(data stored in token)
      process.env.JWT_SECRET, //Secrect key from .env
      { expiresIn: process.env.JWT_EXPIRE }, // Expires in 24h
    );

    //5. Send token to user
    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error) {
    console.error("Login error: ", error);
    res.status(500).json({ error: "Server error during login" });
  }
};

//GET CURRENT USER - Return logged-in user's info
// GET /api/auth/me
//Requires JWT token in header

const getCurrentUser = async (req, res) => {
  try {
    // req.user is set by authMiddleware (contains userId and email)
    const userId = req.user.userId;

    // Fetch full user details from database
    const result = await db.query(
      "SELECT id, email, username, created_at FROM users WHERE id = $1",
      [userId],
    );

    // If user not found (shouldn't happen if token is valid, but just in case)
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = result.rows[0];

    // Return user data (no password!)
    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Server error" });
  }
};
//

module.exports = {
  register,
  login,
  getCurrentUser,
};
