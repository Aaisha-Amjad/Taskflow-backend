//Projects Routes

const express = require("express");
const router = express.Router();
const {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  addMember,
  removeMember,
  updateMemberRole,
} = require("../controllers/projectController");
const authMiddleware = require("../middleware/authMiddleware");
const { isProjectMember, isProjectAdmin, isProjectOwner} = require("../middleware/permissions");

//All routes require authenticationn
router.use(authMiddleware);

//Routes
// POST /api/projects - create new projects
router.post("/", createProject);

// GET /api/projects - get all projects user is a member of
router.get("/", getProjects);

// GET /api/projects/:id - Get single project
router.get("/:id", getProject);

// PUT /api/projects/:id - update project
router.put("/:id", updateProject);

//DELETE /api/projects/:id - delete project
router.delete("/:id", deleteProject);

//Member Management routes (Muust be admin)
router.post("/:id/members", addMember);
router.delete("/:id/members/:userId", removeMember);
router.patch("/:id/members/:userId/role", updateMemberRole);

//Export
module.exports = router;
