//Tasks Routes
//Defines all tasks-related API endpoints
//connects URLs to controller functions

const express = require('express');
const router = express.Router();

//Import task controller functions
const {
    createTask,
    getTasks,
    getTask,
    updateTask,
    deleteTask,
    updateTaskStatus,
    updateTaskPriority
} = require('../controllers/taskController');

// Import middleware
const authMiddleware = require('../middleware/authMiddleware');
const { isProjectMember } = require('../middleware/permissions');

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

router.post('/projects/:projectId/tasks', isProjectMember, createTask);

//Get all tasks in a project (with filtering/sorting)
// GET /api/projects/:projectId/tasks?status=TODO&priority=HIGH&sort=due_date
//Must be a project member to view tasks
router.get('/projects/:projectId/tasks', isProjectMember, getTasks);

//Get single task details
// GET /api/tasks/:id
// Memebership check happens inside getTask controller
router.get('/tasks/:id', getTask);

//Update task
//PUT /api/tasks/:id
//Membership check happens inside updateTask controller
router.put('/tasks/:id', updateTask);

// Delete task
// DELETE /api/tasks/:id
// Membership check happens inside deleteTask controller
router.delete('/tasks/:id', deleteTask);

//====================================================
// Task status & priority routes
// Seperate endpoints for quick status/priorty updates
//======================================================

//Update only tasks status (TODO/IN_PROGRESS/DONE)

// PATCH /api/tasks/:id/status - update task status
router.patch('/tasks/:id/status', updateTaskStatus);

// PATCH /api/tasks/:id/priority
router.patch('/tasks/:id/priority', updateTaskPriority);


//Export router
//app.js will import this and mount it at /api
module.exports = router;
