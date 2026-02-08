//Comments Routes
//Handles all comment-related API endpoints

const express = require('express');
const router = express.Router();

//Import controller functions
const {
    addComment,
    getComments,
    updateComment,
    deleteComment
} = require('../controllers/commentController');

//Import middleware
const authMiddleware = require('../middleware/authMiddleware');

//Apply authentication to all routes
router.use(authMiddleware);

//Comment CRUD Routes
//Add comment to task
//POST /api/tasks/:taskId/comments
router.post('/tasks/:taskId/comments', addComment);

//Get all comments for a task
// GET /api/tasks/:taskId/comments
router.get('/tasks/:taskId/comments', getComments);

// Update comment (only author can update)
// PUT /api/comments/:id
router.put('/comments/:id', updateComment);

//Delete comment (only author can delete)
//DELETE /api/comments/:id
router.delete('/comments/:id', deleteComment);

// Export router
module.exports = router;