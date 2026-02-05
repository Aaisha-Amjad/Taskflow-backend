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

    //Step 1: validate required fields
    if (!title) {
      return res.status(400).json({
        error: "Task title is required",
      });
    }

    //Step 2: Validate priority if provided
    //Priority must be one of: LOW, MEDIUM, HIGH
    if (priority && !["LOW", "MEDIUM", "HIGH"].includes(priority)) {
      return res.status(400).json({
        error: "Invalid priority. Must be LOW, MEDIUM, or HIGH",
      });
    }

    // STEP 3 : validate status if provided
    // Status must be one of: TODO, IN_PROGRESS, DONE
    if (status && !["TODO", "IN_PROGRESS", "DONE"].includes(status)) {
      return res.status(400).json({
        error: "Invalid status. Must be TODO, IN_PROGRESS, or DONE",
      });
    }

    //Step 4: If assigning to someone, verify they're a project member
    // we cant assign tasks to people who aren't in the project
    if (assigned_to) {
      const memberCheck = await db.query(
        "SELECT user_id FROM project_members WHERE project_id = $1 AND user_id = $2",
        [projectId, assigned_to],
      );

      if (memberCheck.rows.length === 0) {
        return res.status(400).json({
          error: "Cannot assign task to non-member",
        });
      }
    }

    //Step 5: Create the task in database
    // INSERT returns the created task with all fields including auto-generated ones
    const result = await db.query(
      `INSERT INTO tasks
            (project_id, title, description, priority, status, assigned_to, due_date, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,

      [
        projectId,
        title,
        description || null, //use null if no description
        priority || "MEDIUM", // Default priority is medium
        status || "TODO", // Default status is TODO
        assigned_to || null, // use null if not assigned
        due_date || null, // use null if no due date
        userId, //Creator is current user
      ],
    );

    const task = result.rows[0];

    //Step 6: Broadcast real-time event to all project members
    //This notifies everyone in the project that a task was created

    const io = req.app.get("io");
    if (io) {
      io.to(`project_${projectId}`).emit("task_created", {
        task,
        createdBy: { id: userId, email: req.user.email },
      });
    }

    //Step 7 : Send success response
    res.status(201).json({
      message: "Task created successfully",
      task,
    });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ error: "Server error creating task " });
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
      query += ` AND t.priority = $${paramCount}`;
      params.push(priority);
    }

    if (assigned_to) {
      paramCount++;
      query += ` AND t.assigned_to = $${paramCount}`;
      params.push(assigned_to);
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
        query += " ASS";
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
      task: updateTask,
    });
  } catch (error) {
    console.error("Update task priority error:", error);
    res.status(500).json({ error: "Server error updating task priority" });
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
};
