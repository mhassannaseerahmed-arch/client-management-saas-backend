import { Router } from "express";
import crypto from "crypto";
import { ClientModel } from "../models/index.js";
import { requireAccessToken } from "../middleware/auth.js";
import type { UserRecord } from "../types/index.js";

const router = Router();

router.use(requireAccessToken);

// GET /api/clients
router.get("/", async (req, res) => {
  const user = (req as unknown as { user: UserRecord }).user;
  try {
    const clients = await ClientModel.find({ userId: user.id }).lean().exec();
    return res.json(clients);
  } catch {
    return res.status(500).json({ error: "failed_to_fetch_clients" });
  }
});

// POST /api/clients
router.post("/", async (req, res) => {
  const user = (req as unknown as { user: UserRecord }).user;
  const { name, email, company, status } = (req.body ?? {}) as {
    name?: string;
    email?: string;
    company?: string;
    status?: string;
  };

  if (!name || !email || !company) {
    return res.status(400).json({ error: "missing_fields" });
  }

  try {
    const id = crypto.randomUUID();
    const client = await ClientModel.create({
      id,
      userId: user.id,
      name,
      email,
      company,
      status: status || "Active",
    });
    return res.status(201).json(client);
  } catch {
    return res.status(500).json({ error: "failed_to_create_client" });
  }
});

// PUT /api/clients/:id
router.put("/:id", async (req, res) => {
  const user = (req as unknown as { user: UserRecord }).user;
  const { id } = req.params;
  const { name, email, company, status } = (req.body ?? {}) as {
    name?: string;
    email?: string;
    company?: string;
    status?: string;
  };

  try {
    const client = await ClientModel.findOneAndUpdate(
      { id, userId: user.id },
      { $set: { name, email, company, status } },
      { new: true },
    )
      .lean()
      .exec();

    if (!client) return res.status(404).json({ error: "client_not_found" });
    return res.json(client);
  } catch {
    return res.status(500).json({ error: "failed_to_update_client" });
  }
});

// DELETE /api/clients/:id
router.delete("/:id", async (req, res) => {
  const user = (req as unknown as { user: UserRecord }).user;
  const { id } = req.params;

  try {
    const result = await ClientModel.deleteOne({
      id,
      userId: user.id,
    }).exec();
    if (result.deletedCount === 0)
      return res.status(404).json({ error: "client_not_found" });
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "failed_to_delete_client" });
  }
});

export default router;
