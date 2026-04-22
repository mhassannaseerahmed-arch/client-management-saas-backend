import { Router } from "express";
import crypto from "crypto";
import { TaskModel } from "../models/index.js";
import { requireAccessToken } from "../middleware/auth.js";
import type { UserRecord } from "../types/index.js";

const router = Router();

router.use(requireAccessToken);

// GET /api/tasks
router.get("/", async (req, res) => {
  const user = (req as unknown as { user: UserRecord }).user;
  try {
    const tasks = await TaskModel.find({ userId: user.id }).lean().exec();
    return res.json(tasks);
  } catch {
    return res.status(500).json({ error: "failed_to_fetch_tasks" });
  }
});

// POST /api/tasks
router.post("/", async (req, res) => {
  const user = (req as unknown as { user: UserRecord }).user;
  const { projectId, title, status, employeeId } = req.body as {
    projectId?: string;
    title?: string;
    status?: string;
    employeeId?: string;
  };

  if (!projectId || !title)
    return res.status(400).json({ error: "missing_fields" });

  try {
    const id = crypto.randomUUID();
    const task = await TaskModel.create({
      id,
      userId: user.id,
      projectId,
      title,
      status: status || "To Do",
      employeeId: employeeId || null,
    });
    return res.status(201).json(task);
  } catch {
    return res.status(500).json({ error: "failed_to_create_task" });
  }
});

// PUT /api/tasks/:id
router.put("/:id", async (req, res) => {
  const user = (req as unknown as { user: UserRecord }).user;
  const { id } = req.params;
  const { title, status, employeeId } = req.body as {
    title?: string;
    status?: string;
    employeeId?: string;
  };

  try {
    const task = await TaskModel.findOneAndUpdate(
      { id, userId: user.id },
      { $set: { title, status, employeeId } },
      { new: true },
    )
      .lean()
      .exec();

    if (!task) return res.status(404).json({ error: "task_not_found" });
    return res.json(task);
  } catch {
    return res.status(500).json({ error: "failed_to_update_task" });
  }
});

// DELETE /api/tasks/:id
router.delete("/:id", async (req, res) => {
  const user = (req as unknown as { user: UserRecord }).user;
  const { id } = req.params;

  try {
    const result = await TaskModel.deleteOne({ id, userId: user.id }).exec();
    if (result.deletedCount === 0)
      return res.status(404).json({ error: "task_not_found" });
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "failed_to_delete_task" });
  }
});

export default router;
