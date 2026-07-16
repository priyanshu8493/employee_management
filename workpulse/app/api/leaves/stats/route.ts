import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, requireRole } from "@/lib/api-utils";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    await requireRole("OWNER");

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const yearParam = searchParams.get("year");

    if (!userId) return apiError("userId is required", "VALIDATION_ERROR", 400);

    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
    if (isNaN(year)) return apiError("Invalid year", "VALIDATION_ERROR", 400);

    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year + 1, 0, 1);

    const allLeaves = await prisma.leave.findMany({
      where: {
        userId,
        date: { gte: startOfYear, lt: endOfYear },
      },
      select: { date: true, reason: true, id: true },
      orderBy: { date: "desc" },
    });

    const monthlyCounts: Record<number, number> = {};
    for (let m = 0; m < 12; m++) monthlyCounts[m] = 0;

    for (const leave of allLeaves) {
      const month = new Date(leave.date).getMonth();
      monthlyCounts[month]++;
    }

    const monthlyBreakdown = Array.from({ length: 12 }, (_, i) => ({
      month: new Date(year, i).toLocaleString("en-US", { month: "short" }),
      monthIndex: i,
      count: monthlyCounts[i],
    }));

    return apiSuccess({
      userId,
      year,
      totalLeaves: allLeaves.length,
      monthlyBreakdown,
      leaves: allLeaves,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
