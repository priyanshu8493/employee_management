import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function GET() {
  try {
    // Generate a clean, stable SHA-256 hash for the master password
    const hashedPassword = crypto.createHash("sha256").update("Admin@1234").digest("hex");

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
      message: "Database successfully configured with deterministic SHA-256 execution layer!", 
      account: user.email,
      hashStored: hashedPassword
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}