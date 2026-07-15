import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  throw new Error("[auth] FATAL: No AUTH_SECRET or NEXTAUTH_SECRET env var set. Login will fail.");
}

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  avatarUrl: string | null;
  teamId: string | null;
}

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
            console.error("[auth] Missing email or password");
            return null;
          }

          const email = (credentials.email as string).toLowerCase().trim();
          const password = credentials.password as string;

          let user;
          try {
            user = await prisma.user.findUnique({
              where: { email },
            });
          } catch (dbError) {
            console.error("[auth] Database connection error:", dbError);
            return null;
          }

          if (!user) {
            console.error("[auth] User not found:", email);
            return null;
          }
          if (user.isActive === false) {
            console.error("[auth] User is inactive:", email);
            return null;
          }
          if (!user.passwordHash) {
            console.error("[auth] User has no password hash:", email);
            return null;
          }

          const isValid = await bcrypt.compare(password, user.passwordHash);

          if (!isValid) {
            console.error("[auth] Invalid password for:", email);
            return null;
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            avatarUrl: user.avatarUrl,
            teamId: user.teamId,
          };
        } catch (error) {
          console.error("[auth] Unexpected login error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as AuthUser;
        token.id = authUser.id;
        token.role = authUser.role;
        token.avatarUrl = authUser.avatarUrl;
        token.teamId = authUser.teamId;
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
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
});