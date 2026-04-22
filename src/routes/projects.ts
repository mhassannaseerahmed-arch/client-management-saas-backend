import { Router } from "express";
import crypto from "crypto";
import { ProjectModel, TaskModel } from "../models/index.js";
import { requireAccessToken } from "../middleware/auth.js";
import type { UserRecord } from "../types/index.js";

const router = Router();

router.use(requireAccessToken);

// GET /api/projects
router.get("/", async (req, res) => {
  const user = (req as unknown as { user: UserRecord }).user;
  try {
    const projects = await ProjectModel.find({ userId: user.id })
      .lean()
      .exec();
    return res.json(projects);
  } catch {
    return res.status(500).json({ error: "failed_to_fetch_projects" });
  }
});

// POST /api/projects
router.post("/", async (req, res) => {
  const user = (req as unknown as { user: UserRecord }).user;
  const { name, clientId, budget, status, timeline } = req.body as {
    name?: string;
    clientId?: string;
    budget?: number;
    status?: string;
    timeline?: string;
  };

  if (!name || !clientId || budget === undefined || !timeline)
    return res.status(400).json({ error: "missing_fields" });

  try {
    const id = crypto.randomUUID();
    const project = await ProjectModel.create({
      id,
      userId: user.id,
      name,
      clientId,
      budget,
      status: status || "Active",
      timeline,
    });
    return res.status(201).json(project);
  } catch {
    return res.status(500).json({ error: "failed_to_create_project" });
  }
});

// PUT /api/projects/:id
router.put("/:id", async (req, res) => {
  const user = (req as unknown as { user: UserRecord }).user;
  const { id } = req.params;
  const { name, clientId, budget, status, timeline } = req.body as {
    name?: string;
    clientId?: string;
    budget?: number;
    status?: string;
    timeline?: string;
  };

  try {
    const project = await ProjectModel.findOneAndUpdate(
      { id, userId: user.id },
      { $set: { name, clientId, budget, status, timeline } },
      { new: true },
    )
      .lean()
      .exec();

    if (!project)
      return res.status(404).json({ error: "project_not_found" });
    return res.json(project);
  } catch {
    return res.status(500).json({ error: "failed_to_update_project" });
  }
});

// DELETE /api/projects/:id
router.delete("/:id", async (req, res) => {
  const user = (req as unknown as { user: UserRecord }).user;
  const { id } = req.params;

  try {
    const result = await ProjectModel.deleteOne({
      id,
      userId: user.id,
    }).exec();

    if (result.deletedCount === 0)
      return res.status(404).json({ error: "project_not_found" });

    // Cascade-delete tasks belonging to this project
    await TaskModel.deleteMany({ userId: user.id, projectId: id }).exec();

    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "failed_to_delete_project" });
  }
});

export default router;
