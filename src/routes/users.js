//User Routes
//Handles user dashbaord and personal views

const express = require("express");
const router = express.Router();

//Import controller functions
const { getMyTasks, getMyProjects } = require("../controllers/userController");

//Import middleware
const authMiddleware = require("../middleware/authMiddleware");
const { route } = require("./tasks");

//Apply authentication to all routes
router.use(authMiddleware);

//User dashbord Routes
// Get all tasks assigned to current user
//GET /api/users/me/tasks?status=TODO&project_id=1

//SWAGGER DOCUMENTATION FOR USER ENDPOINTS

/**
 * @swagger
 * /api/users/me/tasks:
 *   get:
 *     summary: Get all tasks assigned to current user (dashboard)
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [TODO, IN_PROGRESS, DONE]
 *         description: Filter by status
 *       - in: query
 *         name: project_id
 *         schema:
 *           type: integer
 *         description: Filter by project
 *     responses:
 *       200:
 *         description: User's tasks categorized by due date
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     overdue:
 *                       type: integer
 *                     today:
 *                       type: integer
 *                     upcoming:
 *                       type: integer
 *                     completed:
 *                       type: integer
 *                 tasks:
 *                   type: object
 *                   properties:
 *                     overdue:
 *                       type: array
 *                       items:
 *                         type: object
 *                     today:
 *                       type: array
 *                       items:
 *                         type: object
 *                     upcoming:
 *                       type: array
 *                       items:
 *                         type: object
 *                     noDueDate:
 *                       type: array
 *                       items:
 *                         type: object
 *                     completed:
 *                       type: array
 *                       items:
 *                         type: object
 */

router.get("/me/tasks", getMyTasks);

//Get all projects user is a memeber of
// GET /api/users/me/projects

/**
 * @swagger
 * /api/users/me/projects:
 *   get:
 *     summary: Get all projects user is a member of (with stats)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: User's projects with completion percentages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 projects:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       role:
 *                         type: string
 *                       member_count:
 *                         type: integer
 *                       task_count:
 *                         type: integer
 *                       completed_tasks:
 *                         type: integer
 *                       completion_percentage:
 *                         type: integer
 *                 count:
 *                   type: integer
 */

router.get("/me/projects", getMyProjects);

// Export router
module.exports = router;
