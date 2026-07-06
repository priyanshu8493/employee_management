import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.error("Auth Error: Missing credentials");
            return null;
          }

          // Ensure email is lowercase and trimmed to prevent accidental mismatch
          const email = (credentials.email as string).toLowerCase().trim();
          const password = credentials.password as string;

          const user = await prisma.user.findUnique({
            where: { email },
          });

          if (!user) {
            console.error(`Auth Error: No user found with email ${email}`);
            return null;
          }

          // Only block if the account is EXPLICITLY disabled in the DB
          if (user.isActive === false) {
            console.error(`Auth Error: Account for ${email} is inactive`);
            return null;
          }

          if (!user.passwordHash) {
            console.error(`Auth Error: User ${email} has no password set in database`);
            return null;
          }

          const isValid = await bcrypt.compare(password, user.passwordHash);

          if (!isValid) {
            console.error(`Auth Error: Invalid password provided for ${email}`);
            return null;
          }

          console.log(`Auth Success: User ${email} logged in successfully`);

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatarUrl: user.avatarUrl,
            teamId: user.teamId,
          };
        } catch (error) {
          console.error("Auth Exception:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as any).role as Role;
        token.avatarUrl = (user as any).avatarUrl as string | null;
        token.teamId = (user as any).teamId as string | null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.avatarUrl = token.avatarUrl as string | null;
        session.user.teamId = token.teamId as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  // Ensure we check both common secret variables safely
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
});