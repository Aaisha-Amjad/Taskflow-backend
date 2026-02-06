//User Routes
//Handles user dashbaord and personal views

const express = require('express');
const router = express.Router();

//Import controller functions
const {
    getMyTasks,
    getMyProjects
} = require('../controllers/userController');

//Import middleware 
const authMiddleware = require('../middleware/authMiddleware');
const { route } = require('./tasks');

//Apply authentication to all routes
router.use(authMiddleware);

//User dashbord Routes
// Get all tasks assigned to current user
//GET /api/users/me/tasks?status=TODO&project_id=1
router.get('/me/tasks', getMyTasks);

//Get all projects user is a memeber of
// GET /api/users/me/projects
router.get('/me/projects', getMyProjects);

// Export router
module.exports = router;
