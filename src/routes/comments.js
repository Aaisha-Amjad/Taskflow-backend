//Comments Routes
//Handles all comment-related API endpoints

const express = require("express");
const router = express.Router();

//Import controller functions
const {
  addComment,
  getComments,
  updateComment,
  deleteComment,
} = require("../controllers/commentController");

//Import middleware
const authMiddleware = require("../middleware/authMiddleware");

//Apply authentication to all routes

router.use(authMiddleware);

//Comment CRUD Routes
//Add comment to task
//POST /api/tasks/:taskId/comments

// SWAGGER DOCUMENTATION FOR COMMENT ENDPOINTS

/**
 * @swagger
 * /api/tasks/{taskId}/comments:
 *   post:
 *     summary: Add a comment to a task
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: taskId
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
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: This looks good! I'll start working on it.
 *     responses:
 *       201:
 *         description: Comment added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 comment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     content:
 *                       type: string
 *                     author:
 *                       type: object
 *       400:
 *         description: Content required
 *       403:
 *         description: Only project members can comment
 *       404:
 *         description: Task not found
 */
router.post("/tasks/:taskId/comments", addComment);

//Get all comments for a task
// GET /api/tasks/:taskId/comments

/**
 * @swagger
 * /api/tasks/{taskId}/comments:
 *   get:
 *     summary: Get all comments for a task
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of comments (oldest first)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 comments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       content:
 *                         type: string
 *                       author_username:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                 count:
 *                   type: integer
 *       403:
 *         description: Only project members can view comments
 */

router.get("/tasks/:taskId/comments", getComments);

// Update comment (only author can update)
// PUT /api/comments/:id

/**
 * @swagger
 * /api/comments/{id}:
 *   put:
 *     summary: Update own comment
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Comment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: Updated comment text
 *     responses:
 *       200:
 *         description: Comment updated
 *       403:
 *         description: Can only edit own comments
 *       404:
 *         description: Comment not found
 */

router.put("/comments/:id", updateComment);

//Delete comment (only author can delete)
//DELETE /api/comments/:id

/**
 * @swagger
 * /api/comments/{id}:
 *   delete:
 *     summary: Delete own comment
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *       403:
 *         description: Can only delete own comments
 *       404:
 *         description: Comment not found
 */
router.delete("/comments/:id", deleteComment);

// Export router
module.exports = router;
