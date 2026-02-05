//permission middlware
//check if user has required permissions for project requirements

const db = require("../config/db");

//check if user is a member of the project
const isProjectMember = async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const userId = req.user.userId;

    const result = await db.query(
      "SELECT role FROM project_members WHERE project_id = $1 and user_id = $2",
      [projectId, userId],
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        error: "Access denied: You are not a member of this project",
      });
    }

    //Attach role to request for use in controllers
    req.userRole = result.rows[0].role;
    next();
  } catch (error) {
    console.error("Permission check errror: ", error);
    res.status(500).json({ error: "Server error checking permissions" });
  }
};

// Check is user is a project admin
const isProjectAdmin = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.userId;

    const result = await db.query(
      "SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2",
      [projectId, userId],
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        error: "Access denied: You are not a member of this project",
      });
    }
    if (result.rows[0].role !== "admin") {
      return res.status(403).json({
        error: "Access denied: Only project admins can perform this action",
      });
    }
    req.userRole = "admin";
    next();
  } catch (error) {
    console.error("Admin check error: ", error);
    res.status(500).json({ error: "Server error checking admin permissions " });
  }
};

//Check if user is project owner
const isProjectOwner = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const userId = req.user.userId;

    const result = await db.query(
      "SELECT owner_id FROM projects WHERE id = $1",
      [projectId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project not foundd" });
    }

    if (result.rows[0].owner_id !== userId) {
      return res.status(403).json({
        error: "Access denied: Only project owner can perform this action",
      });
    }
    next();
  } catch (error) {
    console.error("Owner check error: ", error);
    res.status(500).json({ error: "Server error checking owner permissions " });
  }
};

//Export
module.exports = {
  isProjectMember,
  isProjectAdmin,
  isProjectOwner,
};
