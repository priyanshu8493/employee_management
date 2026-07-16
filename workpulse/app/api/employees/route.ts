import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, requireRole, requireAuth, getAuthSession } from "@/lib/api-utils";
import { employeeSchema } from "@/lib/validations";
import { generatePassword } from "@/lib/utils";
export const runtime = "nodejs";


export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) return apiError("Unauthorized", "UNAUTHORIZED", 401);
    if (session.user.role !== "OWNER" && session.user.role !== "TEAM_LEADER") {
      return apiError("Forbidden", "FORBIDDEN", 403);
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");
    const isActive = searchParams.get("isActive");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = { role: { in: ["EMPLOYEE", "TEAM_LEADER"] } };
    if (teamId) {
      where.teamId = teamId;
    } else if (session.user.role === "TEAM_LEADER") {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { teamId: true },
      });
      if (user?.teamId) where.teamId = user.teamId;
    }
    if (isActive !== null) where.isActive = isActive === "true";
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const weekStart = new Date();
    const dayOfWeek = weekStart.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    weekStart.setDate(weekStart.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const [employees, weekAggregates] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatarUrl: true,
          phone: true,
          designation: true,
          isActive: true,
          joinedAt: true,
          leftAt: true,
          teamId: true,
          team: { select: { id: true, name: true } },
          createdAt: true,
          timeEntries: {
            where: { checkOutAt: null },
            take: 1,
            include: { project: { select: { id: true, name: true } } },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.timeEntry.groupBy({
        by: ["userId"],
        where: {
          checkInAt: { gte: weekStart },
          durationMinutes: { not: null },
        },
        _sum: { durationMinutes: true },
      }),
    ]);

    const weekMap = new Map<string, number>();
    for (const agg of weekAggregates) {
      if (!agg.userId) continue;
      weekMap.set(agg.userId, agg._sum.durationMinutes || 0);
    }

    const employeesWithStats = employees.map((emp) => ({
      ...emp,
      hoursThisWeek: weekMap.get(emp.id) || 0,
    }));

    return apiSuccess(employeesWithStats);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole("OWNER");
    const body = await request.json();
    const parsed = employeeSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: parsed.email } });
    if (existing) return apiError("Email already in use", "DUPLICATE_EMAIL", 409);

    const password = parsed.password || generatePassword(12);
    const passwordHash = await bcrypt.hash(password, 12);

    const employee = await prisma.user.create({
      data: {
        name: parsed.name,
        email: parsed.email,
        passwordHash,
        role: parsed.role || "EMPLOYEE",
        teamId: parsed.teamId || null,
        isActive: parsed.isActive ?? true,
        avatarUrl: parsed.avatarUrl,
        phone: parsed.phone,
        designation: parsed.designation,
        joinedAt: parsed.joinedAt ? new Date(parsed.joinedAt) : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        teamId: true,
        isActive: true,
        avatarUrl: true,
        phone: true,
        designation: true,
        joinedAt: true,
      },
    });

    return apiSuccess({ ...employee, tempPassword: password });
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return apiError("Validation failed", "VALIDATION_ERROR", 400);
    }
    return handleApiError(error);
  }
}
