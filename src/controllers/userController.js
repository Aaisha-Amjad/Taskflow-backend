//User controller
//Handles user-specific queries like dashboard views

const db = require("../config/db");

//GET MY ASSIGNED TASKS
// GET /api/users/me/tasks
//returns all tasks assigned to the current user
// supports filtering by status and project

const getMyTasks = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { status, project_id } = req.query;

    //Step 1 : Build query to get user's assigned task
    let query = `
          SELECT
            t.*,
            p.name as project_name,
            u1.username as created_by_username,
            u1.email as created_by_email
          FROM tasks t
          JOIN projects p ON t.project_id = p.id
          LEFT JOIN users u1 ON t.created_by = u1.id
          WHERE t.assigned_to = $1
        `;
    const params = [userId];
    let paramCount = 1;

    // Step 2: Add optional filters
    if (status) {
      paraCount++;
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
    }

    if (project_id) {
      paramCount++;
      query += ` AND t.project_id = $${paramCount}`;
      params.push(project_id);
    }

    //Step 3 : Order by due date (overdue first) and priority
    query += `
            ORDER BY
                CASE
                    WHEN t.due_date < CURRENT_TIMESTAMP THEN 0
                    ELSE 1
                END,
                t.due_date ASC,
                CASE t.priority
                    WHEN 'HIGH' THEN 1
                    WHEN 'MEDIUM' THEN 2
                    WHEN 'LOW' THEN 3
                END
                `;
    // Step 4: execute query
    const result = await db.query(query, params);

    // Step 5: categorise tasks
    const now = new Date();
    const tasks = result.rows;

    const categorized = {
      overdue: tasks.filter(
        (t) => t.due_date && new Date(t.due_date) < now && t.status !== "DONE",
      ),
      today: tasks.filter((t) => {
        if (!t.due_date || t.status === "DONE") return false;
        const dueDate = new Date(t.due_date);
        return dueDate.toDateString() === now.toDateString();
      }),
      upcoming: tasks.filter((t) => {
        if (!t.due_date || t.status === "DONE") return false;
        const dueDate = new Date(t.due_date);
        return dueDate > now && dueDate.toDateString() !== now.toDateString();
      }),
      noDueDate: tasks.filter((t) => !t.due_date && t.status !== "DONE"),
      completed: tasks.filter((t) => t.status === "DONE"),
    };

    //Step 6: Return categorised tasks
    res.json({
      summary: {
        total: tasks.length,
        overdue: categorized.overdue.length,
        today: categorized.today.length,
        upcoming: categorized.upcoming.length,
        completed: categorized.completed.length,
      },
      tasks: categorized,
    });
  } catch (error) {
    console.error("Get my tasks error: ", error);
    res.status(500).json({ error: "Server error fetching tasks" });
  }
};

//GET MY PROJECTS
// GET /api/users/me/projects
//Returns all projects the user is a member of
//Includes role and member count

const getMyProjects = async (req, res) => {
  try {
    const userId = req.user.userId;

    //Step 1: Get all projects user is a memeber of
    const query = `
            SELECT
                p.*,
                pm.role,
                pm.joined_at,
                u.username as owner_username,
                u.email as owner_email,
                COUNT(DISTINCT pm2.user_id) as member_count,
                COUNT (DISTINCT t.id) as task_count,
                COUNT(DISTINCT CASE WHEN t.status = 'DONE' THEN t.id END) as completed_tasks
            FROM projects p
            JOIN project_members pm ON p.id = pm.project_id
            LEFT JOIN users u ON p.owner_id = u.id
            LEFT JOIN project_members pm2 ON p.id = pm2.project_id
            LEFT JOIN tasks t ON p.id = t.project_id
            WHERE pm.user_id = $1
            GROUP BY p.id, pm.role, pm.joined_at, u.username, u.email
            ORDER BY pm.joined_at DESC
            `;

    const result = await db.query(query, [userId]);

    //Step 2: calculate completion percentage for each project
    const projects = result.rows.map((project) => ({
      ...project,
      completion_percentage:
        project.task_count > 0
          ? Math.round((project.completed_tasks / project.task_count) * 100)
          : 0,
    }));

    // Step 3: Return projects
    res.json({
      projects,
      count: projects.length,
    });
  } catch (error) {
    console.error("Get my projects error:", error);
    res.status(500).json({ error: "Server error fetching projects" });
  }
};

//Exports functions
module.exports = {
  getMyTasks,
  getMyProjects,
};
