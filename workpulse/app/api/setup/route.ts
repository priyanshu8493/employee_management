import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getAuthSession, apiSuccess, apiError, handleApiError } from "@/lib/api-utils";
export const runtime = "nodejs";


export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return apiError("Unauthorized", "UNAUTHORIZED", 401);
    }
    if (session.user.role !== "OWNER") {
      return apiError("Forbidden", "FORBIDDEN", 403);
    }

    const hashedPassword = await bcrypt.hash("Admin@1234", 12);

    const user = await prisma.user.upsert({
      where: { email: 'rabi@smcadservices.com' },
      update: {
        passwordHash: hashedPassword,
        isActive: true,
        role: 'OWNER'
      },
      create: {
        email: 'rabi@smcadservices.com',
        name: 'Rabi Mandal',
        passwordHash: hashedPassword,
        isActive: true,
        role: 'OWNER'
      }
    });

    return apiSuccess({ message: "Owner account configured", email: user.email });
  } catch (error) {
    return handleApiError(error);
  }
}