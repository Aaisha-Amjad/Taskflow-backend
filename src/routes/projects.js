//Projects Routes

const express = require("express");
const router = express.Router();
const projectController = require("../controllers/projectController");
const authMiddleware = require("../middleware/authMiddleware");

//All routes require authenticationn
router.use(authMiddleware);

//Routes
// POST /api/projects - create new projects
router.post("/", projectController.createProject);

// GET /api/projects - get all projects user is a member of
router.get("/", projectController.getProjects);

// GET /api/projects/:id - Get single project
router.get("/:id", projectController.getProject);

// PUT /api/projects/:id - update project
router.put("/:id", projectController.updateProject);

//DELETE /api/projects/:id - delete project
router.delete("/:id", projectController.deleteProject);

//Export
module.exports = router;
