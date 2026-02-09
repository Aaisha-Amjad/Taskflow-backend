//Tasks Routes
//Defines all tasks-related API endpoints
//connects URLs to controller functions

const express = require("express");
const router = express.Router();

//Import task controller functions
const {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
  updateTaskPriority,
  assignTask,
  unassignTask,
  searchTasks,
} = require("../controllers/taskController");

// Import middleware
const authMiddleware = require("../middleware/authMiddleware");
const { isProjectMember } = require("../middleware/permissions");

//===================================
//Apply authentication to ALL task routes
//Every route below require valid JWT token
//======================================
router.use(authMiddleware);

//=====================================
//Task CRUD Routes
//==========================================

// Create new task in a project
// POST /api/projects/:projectId/tasks
// Must be a project member to create tasks

// SWAGGER DOCUMENTATION FOR TASK ENDPOINTS

/**
 * @swagger
 * /api/projects/{projectId}/tasks:
 *   post:
 *     summary: Create a new task in a project
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Project ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: Fix login bug
 *               description:
 *                 type: string
 *                 example: Users unable to login with Google OAuth
 *               status:
 *                 type: string
 *                 enum: [TODO, IN_PROGRESS, DONE]
 *                 example: TODO
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *                 example: HIGH
 *               assigned_to:
 *                 type: integer
 *                 example: 5
 *               due_date:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-02-15T10:00:00Z
 *     responses:
 *       201:
 *         description: Task created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Not a project member
 */

router.post("/projects/:projectId/tasks", isProjectMember, createTask);

//Search tasks
// GET /api/tasks/search?q=keyword
// MUST come before /tasks/:id route to avoid conflict

/**
 * @swagger
 * /api/tasks/search:
 *   get:
 *     summary: Search tasks by keyword
 *     tags: [Tasks]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search keyword (min 2 characters)
 *         example: login
 *       - in: query
 *         name: project_id
 *         schema:
 *           type: integer
 *         description: Filter by specific project
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 query:
 *                   type: string
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                 count:
 *                   type: integer
 *       400:
 *         description: Query too short
 */

router.get("/tasks/search", searchTasks);

//Assign task to user
//POST /api/tasks/:id/assign

/**
 * @swagger
 * /api/tasks/{id}/assign:
 *   post:
 *     summary: Assign task to a user
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Task ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: integer
 *                 example: 5
 *     responses:
 *       200:
 *         description: Task assigned successfully
 *       400:
 *         description: User not a project member
 *       404:
 *         description: Task not found
 */

router.post("/tasks/:id/assign", assignTask);

//Get all tasks in a project (with filtering/sorting)
// GET /api/projects/:projectId/tasks?status=TODO&priority=HIGH&sort=due_date
//Must be a project member to view tasks

/**
 * @swagger
 * /api/projects/{projectId}/tasks:
 *   get:
 *     summary: Get all tasks in a project (with filtering)
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [TODO, IN_PROGRESS, DONE]
 *         description: Filter by status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH]
 *         description: Filter by priority
 *       - in: query
 *         name: assigned_to
 *         schema:
 *           type: integer
 *         description: Filter by assigned user ID
 *       - in: query
 *         name: overdue
 *         schema:
 *           type: boolean
 *         description: Show only overdue tasks
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [created_at, due_date, priority, status]
 *         description: Sort field
 *     responses:
 *       200:
 *         description: List of tasks
 *       403:
 *         description: Not a project member
 */

router.get("/projects/:projectId/tasks", isProjectMember, getTasks);

//Get single task details
// GET /api/tasks/:id
// Memebership check happens inside getTask controller

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Get single task details
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Task details
 *       404:
 *         description: Task not found
 */

router.get("/tasks/:id", getTask);

//Update task
//PUT /api/tasks/:id
//Membership check happens inside updateTask controller

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: Update task details
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [TODO, IN_PROGRESS, DONE]
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *               assigned_to:
 *                 type: integer
 *               due_date:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: Task updated
 *       404:
 *         description: Task not found
 */

router.put("/tasks/:id", updateTask);

// Delete task
// DELETE /api/tasks/:id
// Membership check happens inside deleteTask controller

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *       404:
 *         description: Task not found
 */

router.delete("/tasks/:id", deleteTask);

//Unassign task
//DELETE /api/tasks/:id/assign

/**
 * @swagger
 * /api/tasks/{id}/assign:
 *   delete:
 *     summary: Unassign task (remove assignee)
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Task unassigned
 *       400:
 *         description: Task not assigned to anyone
 */

router.delete("/tasks/:id/assign", unassignTask);

//====================================================
// Task status & priority routes
// Seperate endpoints for quick status/priorty updates
//======================================================

//Update only tasks status (TODO/IN_PROGRESS/DONE)

/**
 * @swagger
 * /api/tasks/{id}/status:
 *   patch:
 *     summary: Update only task status
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [TODO, IN_PROGRESS, DONE]
 *                 example: IN_PROGRESS
 *     responses:
 *       200:
 *         description: Status updated
 */

// PATCH /api/tasks/:id/status - update task status
router.patch("/tasks/:id/status", updateTaskStatus);

/**
 * @swagger
 * /api/tasks/{id}/priority:
 *   patch:
 *     summary: Update only task priority
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - priority
 *             properties:
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *                 example: HIGH
 *     responses:
 *       200:
 *         description: Priority updated
 */

// PATCH /api/tasks/:id/priority
router.patch("/tasks/:id/priority", updateTaskPriority);

//Export router
//app.js will import this and mount it at /api
module.exports = router;
