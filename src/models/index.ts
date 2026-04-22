import mongoose, { Schema, model } from "mongoose";

const UserSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true },
    role: { type: String, required: true },
    passwordHash: { type: String, required: true },
  },
  { versionKey: false },
);

const RefreshSessionSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    refreshTokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAtMs: { type: Number, required: true, index: true },
    revokedAtMs: { type: Number, required: false },
    replacedBySessionId: { type: String, required: false },
    createdAtMs: { type: Number, required: true },
    lastUsedAtMs: { type: Number, required: false },
  },
  { versionKey: false },
);

const ClientSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    company: { type: String, required: true },
    status: {
      type: String,
      enum: ["Active", "Pending"],
      default: "Active",
    },
  },
  { versionKey: false, timestamps: true },
);

const EmployeeSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, required: true },
    status: {
      type: String,
      enum: ["Active", "On Leave", "Inactive"],
      default: "Active",
    },
  },
  { versionKey: false, timestamps: true },
);

const ProjectSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    clientId: { type: String, required: true, index: true },
    budget: { type: Number, required: true },
    status: {
      type: String,
      enum: ["Active", "Pending", "Completed"],
      default: "Active",
    },
    timeline: { type: String, required: true },
  },
  { versionKey: false, timestamps: true },
);

const TaskSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    projectId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    status: {
      type: String,
      enum: ["To Do", "In Progress", "Done"],
      default: "To Do",
    },
    employeeId: { type: String, required: false, index: true },
  },
  { versionKey: false, timestamps: true },
);

export const UserModel =
  mongoose.models.User || model("User", UserSchema);
export const RefreshSessionModel =
  mongoose.models.RefreshSession ||
  model("RefreshSession", RefreshSessionSchema);
export const ClientModel =
  mongoose.models.Client || model("Client", ClientSchema);
export const EmployeeModel =
  mongoose.models.Employee || model("Employee", EmployeeSchema);
export const ProjectModel =
  mongoose.models.Project || model("Project", ProjectSchema);
export const TaskModel =
  mongoose.models.Task || model("Task", TaskSchema);
