import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, requireAuth, requireRole, getAuthSession } from "@/lib/api-utils";
import { employeeSchema, changePasswordSchema } from "@/lib/validations";
export const runtime = "nodejs";


export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    if (session.user.role !== "OWNER" && session.user.id !== id) {
      return apiError("Forbidden", "FORBIDDEN", 403);
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [employee, todayAgg, weekAgg, monthAgg, projectBreakdown, activeEntry] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          phone: true,
          designation: true,
          isActive: true,
          joinedAt: true,
          leftAt: true,
          role: true,
          createdAt: true,
        },
      }),
      prisma.timeEntry.aggregate({
        where: { userId: id, checkInAt: { gte: startOfDay }, durationMinutes: { not: null } },
        _sum: { durationMinutes: true },
      }),
      prisma.timeEntry.aggregate({
        where: { userId: id, checkInAt: { gte: startOfWeek }, durationMinutes: { not: null } },
        _sum: { durationMinutes: true },
      }),
      prisma.timeEntry.aggregate({
        where: { userId: id, checkInAt: { gte: startOfMonth }, durationMinutes: { not: null } },
        _sum: { durationMinutes: true },
      }),
      prisma.timeEntry.groupBy({
        by: ["projectId"],
        where: { userId: id, durationMinutes: { not: null } },
        _sum: { durationMinutes: true },
      }),
      prisma.timeEntry.findFirst({
        where: { userId: id, checkOutAt: null },
        select: { checkInAt: true, totalPauseMs: true },
      }),
    ]);

    if (!employee) return apiError("Employee not found", "NOT_FOUND", 404);

    const projectIds = projectBreakdown.map((p) => p.projectId);
    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, name: true, color: true },
    });
    const projectMap = new Map(projects.map((p) => [p.id, p]));

    const projectsWithNames = projectBreakdown.map((p) => {
      const project = projectMap.get(p.projectId);
      return { ...project, totalMinutes: p._sum.durationMinutes || 0 };
    });

    const todayBase = todayAgg._sum.durationMinutes || 0;
    const activeMinutes = activeEntry
      ? Math.max(0, (Date.now() - new Date(activeEntry.checkInAt).getTime() - (activeEntry.totalPauseMs || 0)) / 60000)
      : 0;

    return apiSuccess({
      ...employee,
      stats: {
        todayMinutes: todayBase + activeMinutes,
        weekMinutes: weekAgg._sum.durationMinutes || 0,
        monthMinutes: monthAgg._sum.durationMinutes || 0,
        projectBreakdown: projectsWithNames,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const isOwner = session.user.role === "OWNER";
    const isSelf = session.user.id === id;

    if (!isOwner && !isSelf) {
      return apiError("Forbidden", "FORBIDDEN", 403);
    }

    const parsed = employeeSchema.partial().parse(body);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return apiError("Employee not found", "NOT_FOUND", 404);

    if (parsed.email && parsed.email !== existing.email) {
      if (!isOwner) return apiError("Only owners can change email", "FORBIDDEN", 403);
      const emailExists = await prisma.user.findUnique({ where: { email: parsed.email } });
      if (emailExists) return apiError("Email already in use", "DUPLICATE_EMAIL", 409);
    }

    if (parsed.isActive !== undefined && !isOwner) {
      return apiError("Only owners can change status", "FORBIDDEN", 403);
    }

    if (parsed.password) {
      if (parsed.currentPassword) {
        const isValid = await bcrypt.compare(parsed.currentPassword, existing.passwordHash);
        if (!isValid) return apiError("Current password is incorrect", "INVALID_PASSWORD", 400);
      } else if (!isOwner) {
        return apiError("Current password is required", "VALIDATION_ERROR", 400);
      }
    }

    const data: Record<string, unknown> = {};
    if (parsed.name !== undefined) data.name = parsed.name;
    if (parsed.email !== undefined && isOwner) data.email = parsed.email;
    if (parsed.isActive !== undefined && isOwner) {
      data.isActive = parsed.isActive;
      if (parsed.isActive === true) data.leftAt = null;
      if (parsed.isActive === false) data.leftAt = new Date();
    }
    if (parsed.joinedAt !== undefined && isOwner) data.joinedAt = parsed.joinedAt ? new Date(parsed.joinedAt) : null;
    if (parsed.leftAt !== undefined && isOwner) data.leftAt = parsed.leftAt ? new Date(parsed.leftAt) : null;
    if (parsed.avatarUrl !== undefined) data.avatarUrl = parsed.avatarUrl;
    if (parsed.phone !== undefined) data.phone = parsed.phone;
    if (parsed.designation !== undefined) data.designation = parsed.designation;
    if (parsed.role !== undefined && isOwner) data.role = parsed.role;
    if (parsed.password) {
      data.passwordHash = await bcrypt.hash(parsed.password, 12);
    }

    const employee = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, email: true, name: true, role: true,
        isActive: true, avatarUrl: true, phone: true, designation: true,
        joinedAt: true, leftAt: true,
      },
    });

    return apiSuccess(employee);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return apiError("Validation failed", "VALIDATION_ERROR", 400);
    }
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("OWNER");
    const { id } = await params;

    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, isActive: true },
    });
    if (!existing) return apiError("Employee not found", "NOT_FOUND", 404);
    if (existing.role === "OWNER") return apiError("Cannot deactivate owner", "FORBIDDEN", 403);
    if (!existing.isActive) return apiError("Employee already inactive", "BAD_REQUEST", 400);

    await prisma.user.update({
      where: { id },
      data: { isActive: false, leftAt: new Date() },
    });

    await prisma.session.deleteMany({ where: { userId: id } });

    return apiSuccess({ deactivated: true, message: "Employee deactivated. Work data preserved." });
  } catch (error) {
    return handleApiError(error);
  }
}
