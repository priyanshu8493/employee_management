import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";

async function resetPassword() {
  console.log("Connecting to Aiven database...");
  
  // 1. Generate a fresh, flawless hash for Admin@1234
  const hashedPassword = await bcrypt.hash("Admin@1234", 12);

  try {
    // 2. Force an explicit UPDATE on the existing owner account
    const user = await prisma.user.update({
      where: { email: 'owner@workpulse.com' },
      data: {
        passwordHash: hashedPassword,
        isActive: true, // Ensuring the account is absolutely active
      }
    });

    console.log(`✅ SUCCESS: Password for ${user.email} has been strictly set to Admin@1234`);
  } catch (error) {
    console.error("❌ ERROR: Could not update user. Are you sure the email exists?", error);
  }
}

resetPassword();