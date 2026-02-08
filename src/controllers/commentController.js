//Comment controller
//Handles comment CRUD operations on tasks

const db = require("../config/db");

//ADD COMMENT TO TASK
//POST /api/tasks/:taskId/comments
//Body : { content }
//Only project members can comment

const addComment = async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const { content } = req.body;
    const userId = req.user.userId;

    //Step 1: validate content
    if (!content || content.trim().length == 0) {
      return res.status(400).json({ error: "Comment content is required" });
    }

    //Step 2: Check if tasks exists and get its project_id
    const taskResult = await db.query(
      "SELECT project_id FROM tasks WHERE id = $1",
      [taskId],
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const projectId = taskResult.rows[0].project_id;

    //Step 3: Verify user is a project member
    const memberCheck = await db.query(
      "SELECT user_id FROM project_members WHERE project_id = $1 AND user_id = $2",
      [projectId, userId],
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        error: "Access denied: Only project members can comment",
      });
    }

    //Step 4: Insert comment into database
    const result = await db.query(
      `INSERT INTO comments (task_id, user_id, content)
             VALUES ($1, $2, $3)
             RETURNING *`,
      [taskId, userId, content.trim()],
    );

    const comment = result.rows[0];

    //Step 5: Get user details to include in response
    const userResult = await db.query(
      "SELECT id, username, email FROM users WHERE id = $1",
      [userId],
    );

    const author = userResult.rows[0];

    //Step 6 - Broadcast real-time event to project members
    const io = req.app.get("io");
    if (io) {
      io.to(`project_${projectId}`).emit("comment_added", {
        taskId,
        comment: {
          ...comment,
          author,
        },
      });
    }

    //Step 7: Return success response
    res.status(201).json({
      message: "Comment added successfully",
      comment: {
        ...comment,
        author,
      },
    });
  } catch (error) {
    console.error("Add comment error: ", error);
    res.status(500).json({ error: "Server error adding comment" });
  }
};

//GET ALL COMMENTS FOR A TASK
//GET /api/tasks/:taskId/comments
//Returns comments with author information
//Ordered by creation date (oldest first)

const getComments = async (req, res) => {
  try {
    const taskId = req.params.taskId;
    const userId = req.user.userId;

    //Step 1: Check if task exists and get its project_id
    const taskResult = await db.query(
      "SELECT project_id FROM tasks WHERE id = $1",
      [taskId],
    );

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const projectId = taskResult.rows[0].project_id;

    // Step2: verify user is a project_member
    const memberCheck = await db.query(
      "SELECT user_id FROM project_members WHERE project_id = $1 AND user_id = $2",
      [projectId, userId],
    );
    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        error: "Acess denied: Only project members can view comments",
      });
    }

    //Step 3: Get all comments with author information
    const result = await db.query(
      `SELECT
                c.*,
                u.username as author_username
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.task_id = $1
            ORDER BY c.created_at ASC`,
      [taskId],
    );

    //Step 4: Return comments
    res.json({
      comments: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({ error: "Server error fetching comments" });
  }
};

//UPDATE COMMENTS
// PUT /api/comments/:id
// Body : { content }
// Only the comment author can update

const updateComment = async (req, res) => {
  try {
    const commentId = req.params.id;
    const { content } = req.body;
    const userId = req.user.userId;

    // Step 1: Validate content
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: "Comment content is required" });
    }

    // Step 2: Get exisiting comment
    const commentResult = await db.query(
      `SELECT c.*, t.project_id
             FROM comments c
             JOIN tasks t ON c.task_id = t.id
             WHERE c.id = $1`,
      [commentId],
    );

    if (commentResult.rows.length === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }

    const existingComment = commentResult.rows[0];

    //Step 3: Verify user is the comment author
    if (existingComment.user_id !== userId) {
      return res.status(403).json({
        error: "Acess denied: You can only edit your own comments",
      });
    }

    //Step 4: Update comment
    const result = await db.query(
      `UPDATE comments
             SET content = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING *`,
      [content.trim(), commentId],
    );

    const updateComment = result.rows[0];

    // Step  5 : Get user details
    const userResult = await db.query(
      "SELECT id, username, email FROM users WHERE id = $1",
      [userId],
    );

    const author = userResult.rows[0];

    //Step 6: Broadcast real-time event
    const io = req.app.get("io");
    if (io) {
      io.to(`project_${existingComment.project_id}`).emit("comment_updated", {
        commentId,
        taskId: existingComment.task_id,
        comment: {
          ...updateComment,
          author,
        },
      });
    }

    res.json({
      message: "Comment updated successfully",
      comment: { ...updateComment, author },
    });
  } catch (error) {
    console.error("Update comment error: ", error);
    res.status(500).json({ error: "Server error updating comment" });
  }
};

// DELETE COMMENT
// DELETE /api/comments/:id
// Only the comments author can delete

const deleteComment = async (req, res) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.userId;

    // Step 1: Get existing comment
    const commentResult = await db.query(
      `SELECT c.*, t.project_id
             FROM comments c
             JOIN tasks t ON c.task_id = t.id
             WHERE c.id = $1`,
      [commentId],
    );

    if (commentResult.rows.length === 0) {
      return res.status(404).json({ error: "Comment not found" });
    }

    const comment = commentResult.rows[0];

    // Step 2: Verify user is the comment author
    if (comment.user_id !== userId) {
      return res.status(403).json({
        error: "Access denied: You can only delete your own comments",
      });
    }

    //Step 3: Delete comment
    await db.query("DELETE FROM comments WHERE id = $1", [commentId]);

    // Step 4: Broadcast real-time
    const io = req.app.get("io");
    if (io) {
      io.to(`project_${comment.project_id}`).emit("comment_deleted", {
        commentId,
        taskId: comment.task_id,
        deletedBy: { id: userId, email: req.user.email },
      });
    }

    // Step 5: Return success message
    res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error("Delete comment error: ", error);
    res.status(500).json({ error: "Server error deleting comment" });
  }
};

// Export all functions
module.exports = {
  addComment,
  getComments,
  updateComment,
  deleteComment,
};
