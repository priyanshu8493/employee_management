import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const projectSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  clientName: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color").default("#6C63FF"),
  status: z.enum(["ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).optional(),
  estimatedHours: z.number().min(0, "Must be positive").default(0),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  leaderIds: z.array(z.string()).optional(),
});

export const subTaskSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  estimatedHours: z.number().min(0).optional().nullable(),
  assignedToIds: z.array(z.string()).optional(),
});

export const employeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  currentPassword: z.string().optional(),
  role: z.enum(["EMPLOYEE", "TEAM_LEADER"]).optional(),
  isActive: z.boolean().optional(),
  avatarUrl: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
  joinedAt: z.string().optional(),
  leftAt: z.string().optional().nullable(),
});

export const checkInSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  subTaskId: z.string().min(1, "SubTask is required"),
  notes: z.string().optional(),
});

export const checkOutSchema = z.object({
  timeEntryId: z.string().min(1, "Time entry ID is required"),
  notes: z.string().optional(),
  markDone: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  designation: z.string().optional().nullable(),
});

export const qcReportSchema = z.object({
  summary: z.string().min(1, "Summary is required"),
  date: z.string().optional(),
  mistakes: z.array(z.object({
    employeeId: z.string().min(1, "Employee is required"),
    description: z.string().min(1, "Description is required"),
  })).optional(),
});

export const reportFiltersSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  projectIds: z.array(z.string()).optional(),
  employeeIds: z.array(z.string()).optional(),
});
