//database connection module
//handles postgreSQL connection using 'pg' library

const { Pool } = require("pg"); //Import PostgreSQL client
require("dotenv").config(); //Load environment variables from .env file

//----------------------------------------
// Connection pool
// A pool maintains multiple database connections
//More efficient than creating new connection new time
//-------------------------------
const pool = new Pool({
  user: process.env.DB_USER || "postgres", //Database username
  host: process.env.DB_HOST || "localhost", // Database server(localhost since docker maps it)
  database: process.env.DB_NAME || "taskflow", //Database name
  password: process.env.DB_PASSWORD || "password", //Database passowrd
  port: process.env.DB_PORT || 5432, //PostgreSQL default port
});

//------------------------------------------------
//Test connection
//Runs when app starts to verify database is accessible
//--------------------------------------------------
pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL database");
});

//Error handler
//Catches connection errors
pool.on("error", (err) => {
  console.error("❌ Unexpected error on database client:", err);
  process.exit(-1);
});

//Query helper functions
//Makes it easy to run SQL queries from anywhere in the app
//usage: const result = await query('SELECT * FROM users WHERE id = $1',[userId]);

const query = (text, params) => {
  return pool.query(text, params); //execute SQL query
};

//export other files can import this to use the database
module.exports = {
  query, //For running SQL queries
  pool, //For advanced use cases (transactions,etc)
};
