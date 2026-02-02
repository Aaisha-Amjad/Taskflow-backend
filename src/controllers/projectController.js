//Projects controller
//Business logic for project CRUD operations

const db = require("../config/db");

//Create project
// POST /api/projects
// Body : {name, description}

const createProject = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.user.userId; //From  JWT middleware

    //validate input
    if (!name) {
      return res.status(400).json({ error: "Project name is required" });
    }

    //start transaction - we need to create project AND add owner as admin
    const client = await db.pool.connect();
    try {
      await client.query("BEGIN");

      //1. Create project
      const projectResult = await client.query(
        "INSERT INTO projects(name, description, owner_id) VALUES ($1,$2,$3) RETURNING *",
        [name, description || null, userId],
      );
      const project = projectResult.rows[0];

      //2. Add owner as admin member
      await client.query(
        "INSERT INTO project_members(project_id, user_id, role) VALUES ($1, $2, $3)",
        [project.id, userId, "admin"],
      );

      await client.query("COMMIT");

      //3.Boradcast real-time update (if socket.io is available)
      const io = req.app.get("io");
      if (io) {
        io.emit("project_created", {
          project: {
            id: project.id,
            name: project.name,
            description: project.description,
            owner_id: project.created_at,
          },
          creator: {
            id: userId,
            email: req.user.email,
          },
        });
      }
      res.status(201).json({
        message: "Project created successfully",
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          owner_id: project.owner_id,
          created_at: project.created_at,
          updated_at: project.updated_at,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Create project error: ", error);
    res.status(500).json({ error: "Server error during project creation" });
  }
};

//Get all projects (user is memeber of)
//GET /api/projects

const getProjects = async (req, res) => {
  try {
    const userId = req.user.userId;

    //Get all projects where user is a member
    const result = await db.query(
      `SELECT
                p.id,
                p.name,
                p.description,
                p.owner_id,
                p.created_at,
                p.updated_at,
                pm.role,
                u.username as owner_username,
                u.email as owner_email
            FROM projects p
            INNER JOIN project_members pm ON p.id = pm.project_id
            INNER JOIN users u ON p.owner_id = u.id
            WHERE pm.user_id = $1
            ORDER BY p.created_at DESC`,
      [userId],
    );

    res.json({
      projects: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error("Get projects error: ", error);
    res.status(500).json({ error: "Server error fetching projects" });
  }
};

//GET SINGLE PROJECTS
//GET /api/projects/:id

const getProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.userId;

    //Check if user is a member of this project
    const memberCheck = await db.query(
      "SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2",
      [projectId, userId],
    );

    if (memberCheck.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "Access denied: You are not a member of this project" });
    }

    //Get project details
    const projectResult = await db.query(
      `SELECT
                p.*,
                u.username as owner_username,
                u.email as owner_email
            FROM projects p
            INNER JOIN users u ON p.owner_id = u.id
            WHERE p.id = $1`,
      [projectId],
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    //Get all members
    const membersResult = await db.query(
      `SELECT
                pm.user_id,
                pm.role,
                pm.joined_at,
                u.username,
                u.email
            FROM project_members pm
            INNER JOIN users u ON pm.user_id = u.id
            WHERE pm.project_id = $1
            ORDER BY pm.joined_at  ASC`,
      [projectId],
    );

    const project = projectResult.rows[0];
    project.members = membersResult.rows;
    project.user_role = memberCheck.rows[0].role;

    res.json({ project });
  } catch (error) {
    console.error("Get project error: ", error);
    res.status(500).json({ error: "Server error fetching project " });
  }
};

//UPDATE PROJECT
//PUT /api/project/:id
//Body: {name, description}

const updateProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.userId;
    const { name, description } = req.body;

    //Check if user is admin of this project
    const memberCheck = await db.query(
      "SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2",
      [projectId, userId],
    );

    if (memberCheck.rows[0].role !== "admin") {
      return res
        .status(403)
        .json({ error: "Access denied: Only admins can update projects" });
    }

    //Validate input
    if (!name) {
      return res.status(400).json({ error: "Project name is required" });
    }

    //Update project'
    const result = await db.query(
      `UPDATE projects
            SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *`,
      [name, description || null, projectId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    const project = result.rows[0];

    //Broadcast update to project meembers
    const io = req.app.get("io");
    if (io) {
      io.to(`project_${projectId}`).emit("project_updated", {
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          updated_at: project.updated_at,
        },
        updatedBy: {
          id: userId,
          email: req.user.email,
        },
      });
    }

    res.json({
      message: "Project updated successfully",
      project,
    });
  } catch (error) {
    console.error("Updated project error: ", error);
    res.status(500).json({ error: "Server error updationg project " });
  }
};

//DELETE PROJECT
//DELETE /api/projects/:id
//Only admin (owner) can delete
const deleteProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.userId;

    //Check if user is the owner
    const projectResult = await db.query(
      "SELECT owner_id FROM projects WHERE id = $1",
      [projectOd],
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    if (projectResult.rows[0].owner_id !== userId) {
      return res.status(403).json({
        error: "Access denied: Only project owner can delete project",
      });
    }
    //DELETE project (CASCASE will delete memebers and tasks automatically)
    await db.query("DELETE FROM projects WHERE id = $1", [projectId]);

    //Broadcast deletion
    const io = req.app.get("io");
    if (io) {
      io.to(`project_${projectId}`).emit("project_deleted", {
        projectId,
        deletedBy: {
          id: userId,
          email: req.user.email,
        },
      });
    }

    res.json({ message: "project deleted successfully" });
  } catch (error) {
    console.error("Delete project error: ", error);
    res.status(500).json({ error: "Server error deleting project" });
  }
};

//Export
module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
};
