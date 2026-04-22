import { Router } from "express";
import crypto from "crypto";
import { EmployeeModel, TaskModel } from "../models/index.js";
import { requireAccessToken } from "../middleware/auth.js";
import type { UserRecord } from "../types/index.js";

const router = Router();

router.use(requireAccessToken);

// GET /api/employees
router.get("/", async (req, res) => {
  const user = (req as unknown as { user: UserRecord }).user;
  try {
    const employees = await EmployeeModel.find({ userId: user.id })
      .lean()
      .exec();
    return res.json(employees);
  } catch {
    return res.status(500).json({ error: "failed_to_fetch_employees" });
  }
});

// POST /api/employees
router.post("/", async (req, res) => {
  const user = (req as unknown as { user: UserRecord }).user;
  const { name, email, role, status } = req.body as {
    name?: string;
    email?: string;
    role?: string;
    status?: string;
  };

  if (!name || !email || !role)
    return res.status(400).json({ error: "missing_fields" });

  try {
    const id = crypto.randomUUID();
    const employee = await EmployeeModel.create({
      id,
      userId: user.id,
      name,
      email,
      role,
      status: status || "Active",
    });
    return res.status(201).json(employee);
  } catch {
    return res.status(500).json({ error: "failed_to_create_employee" });
  }
});

// PUT /api/employees/:id
router.put("/:id", async (req, res) => {
  const user = (req as unknown as { user: UserRecord }).user;
  const { id } = req.params;
  const { name, email, role, status } = req.body as {
    name?: string;
    email?: string;
    role?: string;
    status?: string;
  };

  try {
    const employee = await EmployeeModel.findOneAndUpdate(
      { id, userId: user.id },
      { $set: { name, email, role, status } },
      { new: true },
    )
      .lean()
      .exec();

    if (!employee)
      return res.status(404).json({ error: "employee_not_found" });
    return res.json(employee);
  } catch {
    return res.status(500).json({ error: "failed_to_update_employee" });
  }
});

// DELETE /api/employees/:id
router.delete("/:id", async (req, res) => {
  const user = (req as unknown as { user: UserRecord }).user;
  const { id } = req.params;

  try {
    const result = await EmployeeModel.deleteOne({
      id,
      userId: user.id,
    }).exec();

    if (result.deletedCount === 0)
      return res.status(404).json({ error: "employee_not_found" });

    // Unlink tasks assigned to this employee
    await TaskModel.updateMany(
      { userId: user.id, employeeId: id },
      { $set: { employeeId: null } },
    ).exec();

    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "failed_to_delete_employee" });
  }
});

export default router;
