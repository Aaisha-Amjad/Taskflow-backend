//Project Module Integration Test

const request = require("supertest");
const app = require("../src/app");
const db = require("../src/config/db");

let authToken;
let userId;
let projectId;
let secondUserId;
let secondUserToken;

//Setup and Teardown

beforeAll(async () => {
  //Clean up test data
  await db.query("DELETE FROM projects WHERE name LIKE '%Test Project%'");
  await db.query("DELETE FROM users WHERE email LIKE '%projecttest'");

  //Create test user
  const registerResponse = await request(app).post("/api/auth/register").send({
    email: "projecttest@example.com",
    username: "projecttest",
    password: "password123",
  });

  //Login to get token
  const loginResponse = await request(app).post("/api/auth/login").send({
    email: "projecttest@example.com",
    password: "password123",
  });

  authToken = loginResponse.body.token;
  userId = loginResponse.body.user.id;

  //Create second user for member tests
  await request(app).post("/api/auth/register").send({
    email: "projecttest2@example.com",
    username: "projecttest2",
    password: "password123",
  });

  const secondLogin = await request(app).post("/api/auth/login").send({
    email: "projecttest2@example.com",
    password: "password123",
  });

  secondUserToken = secondLogin.body.token;
  secondUserId = secondLogin.body.user.id;
});

afterAll(async () => {
  await db.pool.end();
});

//Project CRUD tests
describe("POST /api/projects", () => {
  test("Should create a new project", async () => {
    const response = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        name: "Test Project 1",
        description: "A test project",
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty(
      "message",
      "Project created successfully",
    );
    expect(response.body.project).toHaveProperty("id");
    expect(response.body.project).toHaveProperty("name", "Test Project 1");

    projectId = response.body.project.id;
  });

  test("Should fail to create project without name", async () => {
    const response = await request(app)
      .post("/api/projects")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        description: "No name provided",
      });
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error", "Project name is required");
  });

  test("Should fail without authentication", async () => {
    const response = await request(app).post("/api/projects").send({
      name: "Unauthorized Project",
    });
    expect(response.status).toBe(401);
  });
});

describe("GET /api/projects", () => {
  test("Should get all user projects", async () => {
    const response = await request(app)
      .get("/api/projects")
      .set("Authorization", `Bearer ${authToken}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("projects");
    expect(response.body).toHaveProperty("count");
    expect(Array.isArray(response.body.projects)).toBe(true);
    expect(response.body.projects.length).toBeGreaterThan(0);
  });

  test("Should fail without authentication", async () => {
    const response = await request(app).get("/api/projects");
    expect(response.status).toBe(401);
  });
});

describe("GET /api/projects/:id", () => {
  test("Should get single project details", async () => {
    const response = await request(app)
      .get(`/api/projects/${projectId}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("project");
    expect(response.body.project).toHaveProperty("id", projectId);
    expect(response.body.project).toHaveProperty("members");
    expect(Array.isArray(response.body.project.members)).toBe(true);
  });

  test("Should deny access to non-member", async () => {
    const response = await request(app)
      .get(`/api/projects/${projectId}`)
      .set("Authorization", `Bearer ${secondUserToken}`);
    expect(response.status).toBe(403);
    expect(response.body.error).toMatch(/not a member/i);
  });

  test("Should return 404 for non-existent project", async () => {
    const response = await request(app)
      .get("/api/projects/9999")
      .set("Authorization", `Bearer ${authToken}`);
    expect(response.status).toBe(403);
  });
});

describe("DELETE /api/projects/:id", () => {
  test("Should delete project as owner", async () => {
    const response = await request(app)
      .delete(`/api/projects/${projectId}`)
      .set("Authorization", `Bearer ${authToken}`);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty(
      "message",
      "project deleted successfully",
    );
  });
  test("Should return 404 for already deleted project", async () => {
    const response = await request(app)
      .delete(`/api/projects/${projectId}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(404);
  });
});
