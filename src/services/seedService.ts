import crypto from "crypto";
import bcrypt from "bcryptjs";
import {
  UserModel,
  ClientModel,
  EmployeeModel,
  ProjectModel,
  TaskModel,
} from "../models/index.js";
import type { UserRecord, UserRole } from "../types/index.js";

export async function seedDevUsers(): Promise<void> {
  const seed: Array<{
    email: string;
    username: string;
    role: UserRole;
    password: string;
  }> = [
    {
      email: "admin@demo.com",
      username: "admin",
      role: "admin",
      password: "Admin123!",
    },
    {
      email: "manager@demo.com",
      username: "manager",
      role: "manager",
      password: "Manager123!",
    },
    {
      email: "employee@demo.com",
      username: "employee",
      role: "employee",
      password: "Employee123!",
    },
    {
      email: "client@demo.com",
      username: "client",
      role: "client",
      password: "Client123!",
    },
  ];

  for (const u of seed) {
    const email = u.email.trim().toLowerCase();
    let user = (await UserModel.findOne({ email })
      .lean()
      .exec()) as UserRecord | null;

    if (!user) {
      const id = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(u.password, 12);
      user = { id, email, username: u.username, role: u.role, passwordHash };
      await UserModel.create(user);
    }

    // Seed demo data only for the admin account
    if (user.email === "admin@demo.com") {
      const userId = user.id;
      const clientCount = await ClientModel.countDocuments({ userId });

      if (clientCount === 0) {
        const client1Id = crypto.randomUUID();
        const client2Id = crypto.randomUUID();
        const emp1Id = crypto.randomUUID();

        await ClientModel.create([
          {
            id: client1Id,
            userId,
            name: "John Doe",
            email: "john@example.com",
            company: "Tech Corp",
            status: "Active",
          },
          {
            id: client2Id,
            userId,
            name: "Jane Smith",
            email: "jane@design.io",
            company: "Design Studio",
            status: "Pending",
          },
        ]);

        await EmployeeModel.create([
          {
            id: emp1Id,
            userId,
            name: "Alice Johnson",
            email: "alice@example.com",
            role: "Developer",
            status: "Active",
          },
          {
            id: crypto.randomUUID(),
            userId,
            name: "Bob Smith",
            email: "bob@example.com",
            role: "Designer",
            status: "On Leave",
          },
        ]);

        const proj1Id = crypto.randomUUID();
        await ProjectModel.create([
          {
            id: proj1Id,
            userId,
            name: "E-commerce Website",
            clientId: client1Id,
            budget: 5000,
            status: "Active",
            timeline: "2024-01-01 to 2024-03-31",
          },
          {
            id: crypto.randomUUID(),
            userId,
            name: "Mobile App Redesign",
            clientId: client2Id,
            budget: 3500,
            status: "Pending",
            timeline: "2024-02-15 to 2024-05-15",
          },
        ]);

        await TaskModel.create([
          {
            id: crypto.randomUUID(),
            userId,
            projectId: proj1Id,
            title: "Design homepage",
            status: "Done",
            employeeId: emp1Id,
          },
          {
            id: crypto.randomUUID(),
            userId,
            projectId: proj1Id,
            title: "Develop API",
            status: "In Progress",
            employeeId: emp1Id,
          },
        ]);
      }
    }
  }
}
