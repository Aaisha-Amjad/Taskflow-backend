//Authentication endpoint tests
//tests for register, login and getcurrent user

const request = require("supertest");
const app = require("../src/app");
const db = require("../src/config/db");

//Setup and teardown

//clean up test data before all tests
beforeAll(async () => {
  //delete test users to ensure clean state
  await db.query("DELETE FROM users WHERE  email LIKE '%example'");
});

//close database connection after all tests
afterAll(async () => {
  await db.pool.end();
});

//Registration tests
describe("POST /api/auth/register", () => {
  test("Should register a new user with valid data", async () => {
    const timestamp = Date.now();
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        email: `testuser${timestamp}@example.com`,
        username: `testuser${timestamp}`,
        password: "password123",
      });

    // Debug - remove after seeing output
    if (response.status !== 201) {
      console.log("ERROR:", response.body);
    }

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty(
      "message",
      "User registered successfully",
    );
    expect(response.body).toHaveProperty("user");
    expect(response.body.user).toHaveProperty("id");
    expect(response.body.user).toHaveProperty(
      "email",
      `testuser${timestamp}@example.com`,
    );
    expect(response.body.user).toHaveProperty(
      "username",
      `testuser${timestamp}`,
    );
    expect(response.body.user).not.toHaveProperty("password_hash");
  });

  test("Should fail to register with duplicate email", async () => {
    //first registration
    await request(app).post("/api/auth/register").send({
      email: "testdup@example.com",
      username: "testdup1",
      password: "password123",
    });

    //Attempt duplicate registration
    const response = await request(app).post("/api/auth/register").send({
      email: "testdup@example.com",
      username: "testdup2",
      password: "password456",
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
    expect(response.body.error).toMatch(/already registered/i);
  });

  test("Should fail to register with missing email", async () => {
    const response = await request(app).post("/api/auth/register").send({
      username: "testuser2",
      password: "password123",
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error", "All fields are required");
  });

  test("should fail to register with missing username", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "testuser3@example.com",
      password: "password123",
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error", "All fields are required");
  });

  test("Should fail to register with missing password ", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: "testuser4@example.com",
      username: "testuser4",
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error", "All fields are required");
  });
});

//Login Tests

describe("POST /api/auth/login", () => {
  //create a test user before login tests
  beforeAll(async () => {
    await request(app).post("/api/auth/register").send({
      email: "testlogin@example.com",
      username: "testlogin",
      password: "password123",
    });
  });

  test("Should login with correct credentials", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "testlogin@example.com",
      password: "password123",
    });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("message", "Login successful");
    expect(response.body).toHaveProperty("token");
    expect(response.body).toHaveProperty("user");
    expect(response.body.user).toHaveProperty("email", "testlogin@example.com");
    expect(response.body.user).toHaveProperty("username", "testlogin");
    expect(typeof response.body.token).toBe("string");
    expect(response.body.token.length).toBeGreaterThan(20); //JWT token are long
  });

  test("Should fail to login with incorrect password", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "testllogin@example.com",
      password: "wrongpassword",
    });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("error", "Invalid credentials");
  });

  test("Should fail to login with non-existent email", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "doesnotexist@example.com",
      password: "password123",
    });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("error", "Invalid credentials");
  });

  test("Should fail to login with missing email", async () => {
    const response = await request(app).post("/api/auth/login").send({
      password: "password123",
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
    expect(response.body.error).toMatch(/email.*required/i);
  });

  test("Should fail to login with missing password", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "testlogin@example.com",
    });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
    expect(response.body.error).toMatch(/password.*required/i);
  });
});

//Get current user tests
describe("GET /api/auth/me", () => {
  let validToken;

  //Create user and get token before tests
  beforeAll(async () => {
    //register user
    await request(app).post("/api/auth/register").send({
      email: "testme@example.com",
      username: "testme",
      password: "password123",
    });

    //Login to get token
    const loginResponse = await request(app).post("/api/auth/login").send({
      email: "testme@example.com",
      password: "password123",
    });

    validToken = loginResponse.body.token;
  });

  test("Should get current user with valid token", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${validToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("user");
    expect(response.body.user).toHaveProperty("email", "testme@example.com");
    expect(response.body.user).toHaveProperty("username", "testme");
    expect(response.body.user).toHaveProperty("id");
    expect(response.body.user).not.toHaveProperty("password_hash");
  });

  test("Should fail without authorization header", async () => {
    const response = await request(app).get("/api/auth/me");

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("error", "No token provided");
  });

  test("Should fail with invalid token", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer Invalid_token_here");

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("error", "Invalid token");
  });

  test("Should fail with malformed authorization header", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "InvalidFormat");

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("error", "Invalid token format");
  });
});
