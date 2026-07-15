import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSuccess, apiError, handleApiError, requireAuth } from "@/lib/api-utils";
export const runtime = "nodejs";


export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const leave = await prisma.leave.findUnique({ where: { id } });

    if (!leave) {
      return apiError("Leave not found", "NOT_FOUND", 404);
    }

    if (leave.userId !== session.user.id && session.user.role !== "OWNER") {
      return apiError("You can only cancel your own leave", "FORBIDDEN", 403);
    }

    if (leave.date < new Date()) {
      return apiError("Cannot cancel past leave", "BAD_REQUEST", 400);
    }

    await prisma.leave.delete({ where: { id } });

    return apiSuccess({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
