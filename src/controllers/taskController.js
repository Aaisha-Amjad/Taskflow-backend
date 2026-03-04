//Task controller
//Business logic for task CRUD operations
//Handles creating, reading, updating, deleting tasks
//Also manages task status and priority

const db = require("../config/db");

//Create task
//POST /api/projects/:projectId/tasks
// Body : {title, description, priority, status, assigned_to, due_daate}
const createTask = async (req, res) => {
  try {
    //Get project ID from URL parameter
    const projectId = req.params.projectId;
    //Get task data from request body
    const { title, description, priority, status, assigned_to, due_date } =
      req.body;
    //Get user ID from JWT token (set by authMiddleware)
    const userId = req.user.userId;

    // step1: validate title exists
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: "Task title is required" });
    }
    // Step2 : Validate assignee (if provided) is a project member
    if (assigned_to) {
      const memberCheck = await db.query(
        "SELECT user_id FROM project_members WHERE project_id = $1 AND user_id = $2",
        [projectId, assigned_to],
      );

      if (memberCheck.rows.length === 0) {
        return res
          .status(400)
          .json({ error: "Cannot assign task to non-member" });
      }
    }

    // Step 3: Insert task into database
    const result = await db.query(
      `INSERT INTO tasks(project_id, title, description, status, priority, assigned_to, due_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        projectId,
        title.trim(),
        description || null,
        status || "TODO",
        priority || "MEDIUM",
        assigned_to || null,
        due_date || null,
        userId,
      ],
    );

    const newTask = result.rows[0];

    // Step 4: Get creator details for the broadcast
    const userResult = await db.query(
      "SELECT id, username, email FROM users WHERE id = $1",
      [userId],
    );
    const creator = userResult.rows[0];

    //Step 5: Get assignee details (if task is assigned)
    let assignee = null;
    if (assigned_to) {
      const assigneeResult = await db.query(
        "SELECT id, username, email FROM users WHERE id = $1",
        [assigned_to],
      );
      assignee = assigneeResult.rows[0];
    }

    //STEP 6: Broadcast real time event
    // Get the socket.io instance from express app
    console.log("🔥 DEBUG: About to get io from app");
    const io = req.app.get("io");
    console.log("🔥 DEBUG: io =", io ? "EXISTS" : "NULL");

    if (io) {
      console.log("🔥 DEBUG: Inside io block, about to broadcast");
      //Broadcast to everyone in this project's room
      io.to(`project_${projectId}`).emit("task_created", {
        projectId: parseInt(projectId), // Which project this task belongs to
        task: {
          ...newTask, //All task data(id, title, status)
          created_by: creator, // Who created it (username, email)
          assigned_to: assignee, // Who it'ss assigned to (or null)
        },
      });

      console.log(`📢 Broadcasted task_created event to project_${projectId}`);
    } else {
      console.log("❌ DEBUG: io is NULL - Socket.io not available!");
    }

    //Step 7: Send success response to the API caller
    res.status(201).json({
      message: "Task created successfully",
      task: {
        ...newTask,
        created_by: creator,
        assigned_to: assignee,
      },
    });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ error: "Server error creating task" });
  }
};

// GET ALL TASKS IN PROJECT
// GET /api/projects/:projectId/tasks
//Query params: ?status=TODO&priority=HIGH&assigned_to=5&sort=due_date
// This supports filtering and sorting

const getTasks = async (req, res) => {
  try {
    //Get project ID from URL
    const projectId = req.params.projectId;

    //Get filter/sort paramters from query string
    const { status, priority, assigned_to, sort } = req.query;

    //step 1: Build bas SQL query
    //we join with users table twice
    // -u1 for task creator info
    // -u2 for assigned user info

    let query = `
            SELECT
                t.*,
                u1.username as created_by_username,
                u1.email as created_by_email,
                u2.username as assigned_to_username,
                u2.email as assigned_to_email
                
            FROM tasks t
            LEFT JOIN users u1 ON t.created_by = u1.id
            LEFT JOIN users u2 ON t.assigned_to = u2.id
            WHERE t.project_id = $1
            `;

    // Parameters array for SQL query
    const params = [projectId];
    let paramCount = 1;

    //Step 2: Add filters dynamically based on query params
    // Only add filter if paramter was provided

    if (status) {
      paramCount++;
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
    }

    if (priority) {
      paramCount++;
      query += ` AND t.priority = $${paramCount}`;
      params.push(priority);
    }

    if (assigned_to) {
      paramCount++;
      query += ` AND t.assigned_to = $${paramCount}`;
      params.push(assigned_to);
    }
    // Filter for overdue tasks
    if (req.query.overdue === "true") {
      query += ` AND t.due_date < CURRENT_TIMESTAMP AND t.status != 'DONE'`;
    }

    // Step 3: Add sorting
    // Only allow sorting by valid fields to prevent SQL injection
    const validSortFields = [
      "created_at",
      "due_date",
      "priority",
      "status",
      "title",
    ];

    if (sort && validSortFields.includes(sort)) {
      query += ` ORDER BY t.${sort}`;

      //priority sorting: high>medium>low
      if (sort === "priority") {
        query += ` DESC`;
      } else {
        query += " ASC";
      }
    } else {
      //Defaul: newest tasks first
      query += ` ORDER BY t.created_at DESC`;
    }
    // Step 4: Execute query
    const result = await db.query(query, params);
    //Step 5: return tasks
    res.json({
      tasks: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error("Get tasks error:", error);
    res.status(500).json({ error: "Server error fetching tasks" });
  }
};

//GET SINGLE TASK
//GET /api/tasks/:id
//Returns full task details including creator and assignee info

const getTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.userId;

    //Step 1: Get task with all related information
    //Join with users and projects tables to get complete details

    const result = await db.query(
      `SELECT
                t.*,
                u1.username as created_by_username,
                u1.email as created_by_email,
                u2.username as assigned_to_email,
                u2.email as assigned_to_email,
                p.name as project_name
            FROM tasks t
            LEFT JOIN users u1 ON t.created_by = u1.id
            LEFT JOIN users u2 ON t.assigned_to = u2.id
            LEFT JOIN projects p ON t.project_id = p.id
            WHERE t.id = $1 `,
      [taskId],
    );

    //Step 2: check if task exists
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    const task = result.rows[0];

    //Step 3: Verify user is project membeer
    //Only project members can view tasks
    const memberCheck = await db.query(
      "SELECT user_id FROM project_members WHERE project_id = $1 AND user_id = $2",
      [task.project_id, userId],
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({ error: "Access denied" });
    }

    //Step 4: Return task
    res.json({ task });
  } catch (error) {
    console.error("Get task error:", error);
    res.status(500).json({ error: "Server error fetching task" });
  }
};

//UPDATE TASK
// PUT /api/tasks/:id
//Body :{ title, description, priority, status, assigned_to, due_date}
//Updates only the fields that are provided

const updateTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const { title, description, priority, status, assigned_to, due_date } =
      req.body;
    const userId = req.user.userId;

    //Step 1: Get exisiting task to preserve unchange fields
    const taskResult = await db.query("SELECT * FROM tasks WHERE id = $1", [
      taskId,
    ]);

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const exisitingTask = taskResult.rows[0];
    const projectId = exisitingTask.project_id;

    // Step 2: Verify if user is a project member
    const memberCheck = await db.query(
      "SELECT user_id FROM project_members WHERE project_id = $1 AND user_id = $2",
      [projectId, userId],
    );

    if (memberCheck.rows.length === 0) {
      return res.status(403).json({
        error: "Acess denied: You are not a member of this project",
      });
    }

    // Step 3: If changing assigmee, verify new assignee is  a project member
    if (assigned_to !== undefined && assigned_to !== null) {
      const assigneeCheck = await db.query(
        "SELECT user_id FROM project_members WHERE project_id = $1 AND user_id = $2",
        [projectId, assigned_to],
      );

      if (assigneeCheck.rows.length === 0) {
        return res.status(400).json({
          error: "Cannot assign task to non-member",
        });
      }
    }

    //Step 2: validate priority if provided
    if (priority && !["LOW", "MEDIUM", "HIGH"].includes(priority)) {
      return res.status(400).json({ error: "Invalid priority" });
    }

    //Step 3: Validate status if provided
    if (status && !["TODO", "IN_PROGRESS", "DONE"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    //Step 4: If assigning to someone, verify they're a project member
    if (assigned_to) {
      const memberCheck = await db.query(
        "SELECT user_id FROM project_members WHERE project_id = $1 AND user_id = $2",
        [existingTask.project_id, assigned_to],
      );

      if (memberCheck.rows.length === 0) {
        return res.status(400).json({
          error: "Cannot assign task to non member",
        });
      }
    }

    //Step 5: Update Task
    //Use exisiting values for fields not provided in request
    const result = await db.query(
      `UPDATE tasks
            SET title = $1,
                description = $2,
                priority = $3,
                status = $4,
                assigned_to = $5,
                due_date = $6,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
            RETURNING *`,
      [
        title !== undefined ? title : exisitingTask.title,
        description !== undefined ? description : exisitingTask.description,
        priority !== undefined ? priority : exisitingTask.priority,
        status !== undefined ? status : exisitingTask.status,
        assigned_to !== undefined ? assigned_to : exisitingTask.assigned_to,
        due_date !== undefined ? due_date : exisitingTask.due_date,
        taskId,
      ],
    );

    const task = result.rows[0];

    //Step 6: Broadcast update to project members
    const io = req.app.get("io");
    if (io) {
      io.to(`project_${task.project_id}`).emit("task_updated", {
        task,
        updateTask: { id: userId, email: req.user.email },
      });
    }

    // Step 7: Return updated task
    res.json({
      message: "Task updated successfully",
      task,
    });
  } catch (error) {
    console.error("Update task error: ", error);
    res.status(500).json({ error: "Server error updating task" });
  }
};

//DELETE TASK
// DELETE /api/tasks/:id
//Permanentky removes task and all its comments

const deleteTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.userId;

    // Step 1: Get task to check if it exists and get project_id
    const taskResult = await db.query("SELECT * FROM tasks WHERE id = $1", [
      taskId,
    ]);

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const task = taskResult.rows[0];

    //Step 2: Delete task from database
    //CASCADE will automatically delete related comments
    await db.query("DELETE FROM tasks WHERE id = $1", [taskId]);

    //Step 3: Broadcast deletion to project members
    const io = req.app.get("io");
    if (io) {
      io.to(`project_${task.project_id}`).emit("task_deleted", {
        taskId,
        projectId: task.project_id,
        deletedBy: { id: userId, email: req.user.email },
      });
    }

    //Step 4: Return success messages
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Deleted task error: ", error);
    res.status(500).json({ error: "Server error deleting task" });
  }
};

//UPDATE TASK STATUS
//PATCH /api/tasks/:id/status
// Body :{ status}
//Changes task status : TODO -> IN_PROGRESS -> DONE

const updateTaskStatus = async (req, res) => {
  try {
    const taskId = req.params.id;
    const { status } = req.body;
    const userId = req.user.userId;

    // Step 1: Validate status
    if (!status || !["TODO", "IN_PROGRESS", "DONE"].includes(status)) {
      return res.status(400).json({
        error: "Invalid status. Must be TODO, IN_PROGRESS, or DONE",
      });
    }

    //Step 2: Get existing task
    const taskResult = await db.query("SELECT * FROM tasks WHERE id = $1", [
      taskId,
    ]);

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    const task = taskResult.rows[0];

    //Step 3: Updated status in database
    const result = await db.query(
      `UPDATE tasks
            SET status = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *`,
      [status, taskId],
    );

    const updateTask = result.rows[0];

    //Step 4: Broadcast status change event
    // Send both old and new status so UI can show transition
    const io = req.app.get("io");
    if (io) {
      io.to(`project_${task.project_id}`).emit("task_status_changed", {
        taskId,
        oldStatus: task.status,
        newStatus: status,
        updatedBy: { id: userId, email: req.user.email },
      });
    }

    //Step 5: Return updated Task
    res.json({
      message: "Task status updated successfully",
      task: updateTask,
    });
  } catch (error) {
    console.error("Update task status error: ", error);
    res.status(500).json({ error: "Server error updating task status" });
  }
};

// UPDATE task priority
// PATCH /api/tasks/:id/priority
// Body : {priority}
// Changes task priority: LOW/ MEDIUM/ HIGH
const updateTaskPriority = async (req, res) => {
  try {
    const taskId = req.params.id;
    const { priority } = req.body;
    const userId = req.user.userId;

    // Step1: validate priority
    if (!priority || !["LOW", "MEDIUM", "HIGH"].includes(priority)) {
      return res.status(400).json({
        error: "Invalid priority. Must be LOW, MEDIUM, or HIGH",
      });
    }

    // Step 2: Get exisiting task
    const taskResult = await db.query("SELECT * FROM tasks WHERE id = $1", [
      taskId,
    ]);

    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    const task = taskResult.rows[0];

    //Step 3: update priority in database
    const result = await db.query(
      `UPDATE tasks
            SET priority = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *`,
      [priority, taskId],
    );

    const updatedTask = result.rows[0];

    //Step 4: Broadcast priority change event
    const io = req.app.get("io");
    if (io) {
      io.to(`project_${task.project_id}`).emit("task_priority_changed", {
        taskId,
        oldPriority: task.priority,
        newPriority: priority,
        updatedBy: { id: userId, email: req.user.email },
      });
    }

    //Step 5: Return updated task
    res.json({
      message: "Task priority updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Update task priority error:", error);
    res.status(500).json({ error: "Server error updating task priority" });
  }
};

// Assign task to task to user
// POST /api/tasks/:id/assign
//Body :{ userId }
//Assign a tasl to a specific user ( must be project member)
const assignTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const { userId } = req.body;
    const currenUserId = req.user.userId;

    //Step 1: Validate userId is provided
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    //Step 2: Get task details
    const taskResult = await db.query("SELECT * FROM tasks WHERE id = $1", [
      taskId,
    ]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }
    const task = taskResult.rows[0];

    //Step 3: Verify the user being assigned is a project member
    const memberCheck = await db.query(
      "SELECT user_id FROM project_members WHERE project_id = $1 AND user_id = $2",
      [task.project_id, userId],
    );
    if (memberCheck.rows.length === 0) {
      return res.status(400).json({
        error: "Cannot assign task to non-member",
      });
    }
    //Step4: Update task with assigned user
    const result = await db.query(
      `UPDATE tasks
      SET assigned_to = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *`,
      [userId, taskId],
    );
    const updatedTask = result.rows[0];

    //Step 5: Get assignee user details for response
    const userResult = await db.query(
      "SELECT id, username, email FROM users WHERE id = $1",
      [userId],
    );

    const assignee = userResult.rows[0];

    //Step 6: Broadcast real-time event
    const io = req.app.get("io");
    if (io) {
      io.to(`project_${task.project_id}`).emit("task_assigned", {
        taskId,
        task: updatedTask,
        assignee,
        assignedBy: { id: currenUserId, email: req.user.email },
      });
    }

    //Step 7: Return success response
    res.json({
      message: "Task assigned successfully",
      task: updatedTask,
      assignee,
    });
  } catch (error) {
    console.error("Assign task error: ", error);
    res.status(500).json({ error: " Server error assigning task" });
  }
};

//UNASSIGN TASK
//DELETE /api/tasks/:id/assign
//Removes the assigned user from a task
const unassignTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const currentUserId = req.user.userId;

    //Step 1 get task details
    const taskResult = await db.query("SELECT * FROM tasks WHERE id = $1", [
      taskId,
    ]);
    if (taskResult.rows.length === 0) {
      return res.status(404).json({ error: "Task not found" });
    }

    const task = taskResult.rows[0];
    //Step 2: Check if tasl is currently assigned
    if (!task.assigned_to) {
      return res.status(400).json({ error: "Task is not assigned to anyone" });
    }

    // Step 3: Unassign task (set assigned_to to NULL)
    const result = await db.query(
      `UPDATE tasks
       SET assigned_to = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [taskId],
    );

    const updatedTask = result.rows[0];
    //Step 4: Broadcast real-time event
    const io = req.app.get("io");
    if (io) {
      io.to(`project_${task.project_id}`).emit("task_unassigned", {
        taskId,
        task: updatedTask,
        unassignedBy: { id: currentUserId, email: req.user.email },
      });
    }

    //Step 5: Return success response
    res.json({
      message: "Tasl unassigned successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("Unassign task error: ", error);
    res.status(500).json({ error: "Server error unassigning task" });
  }
};

//SEARCH TASKS
//GET /api/tasks/search?q=keyword&project_id=1
// Searches tasks by title and description
//Optionally filter by project

const searchTasks = async (req, res) => {
  try {
    const { q, project_id } = req.query;
    const userId = req.user.userId;

    //Step 1: Validate search query
    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        error: " Search query must be atleast 2 characters",
      });
    }

    //Step 2: Build search query
    // Only search in projects where user is member
    let query = `
      SELECT DISTINCT
        t.*,
        p.name as project_name,
        u1.username as created_by_username,
        u2.username as assigned_to_username,
        CASE
          WHEN t.title ILIKE $2 THEN 1
          ELSE 2
        END as relevance
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      JOIN project_members pm ON p.id = pm.project_id
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      WHERE pm.user_id = $1
        AND (
          t.title ILIKE $2
          OR t.description ILIKE $2
          )`;

    const params = [userId, `%${q}%`];
    let paramCount = 2;

    //Step 3: Optional project filter
    if (project_id) {
      paramCount++;
      query += ` AND t.project_id = $${paramCount}`;
      params.push(project_id);
    }

    //Step 4: Order by relevance (title matches first)
    query += `
      ORDER BY
        relevance,
        t.created_at DESC
      LIMIT 50`;

    // Step 5: Execute query
    const result = await db.query(query, params);

    //Step 6: Return results
    res.json({
      query: q,
      results: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error(" Search tasks error: ", error);
    res.status(500).json({ erro: "Server error searching tasks" });
  }
};

//Export all functions
//These will imported by routes/tasks.js
module.exports = {
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
};
