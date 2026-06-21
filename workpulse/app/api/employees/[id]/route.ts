import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, requireRole } from "@/lib/api-utils";
import { employeeSchema, changePasswordSchema } from "@/lib/validations";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireRole("OWNER");
    const { id } = await params;

    const employee = await prisma.user.findUnique({
      where: { id, role: "EMPLOYEE" },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        phone: true,
        isActive: true,
        teamId: true,
        team: { select: { id: true, name: true } },
        createdAt: true,
      },
    });

    if (!employee) return apiError("Employee not found", "NOT_FOUND", 404);

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayAgg, weekAgg, monthAgg, projectBreakdown] = await Promise.all([
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
    ]);

    const projectsWithNames = await Promise.all(
      projectBreakdown.map(async (p) => {
        const project = await prisma.project.findUnique({
          where: { id: p.projectId },
          select: { id: true, name: true, color: true },
        });
        return { ...project, totalMinutes: p._sum.durationMinutes || 0 };
      })
    );

    return apiSuccess({
      ...employee,
      stats: {
        todayMinutes: todayAgg._sum.durationMinutes || 0,
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
    await requireRole("OWNER");
    const { id } = await params;
    const body = await request.json();
    const parsed = employeeSchema.partial().parse(body);

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return apiError("Employee not found", "NOT_FOUND", 404);

    const data: Record<string, unknown> = {};
    if (parsed.name !== undefined) data.name = parsed.name;
    if (parsed.teamId !== undefined) data.teamId = parsed.teamId;
    if (parsed.isActive !== undefined) data.isActive = parsed.isActive;
    if (parsed.avatarUrl !== undefined) data.avatarUrl = parsed.avatarUrl;
    if (parsed.phone !== undefined) data.phone = parsed.phone;
    if (parsed.password) {
      data.passwordHash = await bcrypt.hash(parsed.password, 12);
    }

    const employee = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, email: true, name: true, role: true, teamId: true,
        isActive: true, avatarUrl: true, phone: true,
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
      include: { _count: { select: { timeEntries: true } } },
    });
    if (!existing) return apiError("Employee not found", "NOT_FOUND", 404);

    if (existing._count.timeEntries > 0) {
      await prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
      return apiSuccess({ message: "Employee deactivated (has time entries)" });
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    return apiSuccess({ message: "Employee deactivated" });
  } catch (error) {
    return handleApiError(error);
  }
}
