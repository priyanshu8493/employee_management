import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getAuthSession } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "OWNER") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
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
        name: 'Rabi Mondal',
        passwordHash: hashedPassword,
        isActive: true,
        role: 'OWNER'
      }
    });

    return NextResponse.json({
      success: true,
      message: "Owner account configured",
      account: user.email,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}