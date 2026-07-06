import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Generate the hash directly on the Vercel server
    const hashedPassword = await bcrypt.hash("Admin@1234", 12);

    // Force an upsert on the exact database Vercel is using
    const user = await prisma.user.upsert({
      where: { email: 'owner@workpulse.com' },
      update: {
        passwordHash: hashedPassword,
        isActive: true,
        role: 'OWNER'
      },
      create: {
        email: 'owner@workpulse.com',
        name: 'System Owner',
        passwordHash: hashedPassword,
        isActive: true,
        role: 'OWNER'
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "Database explicitly updated by Vercel!", 
      account: user.email 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}