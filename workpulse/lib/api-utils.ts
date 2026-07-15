import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { ApiResponse } from "@/types";

export function apiSuccess<T>(data: T, meta?: Record<string, unknown>): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ data, error: null, meta });
}

export function apiError(message: string, code: string, status: number = 400): NextResponse<ApiResponse> {
  return NextResponse.json({ data: null, error: { message, code } }, { status });
}

export async function getAuthSession() {
  const session = await auth();
  return session;
}

export async function requireAuth() {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireRole(role: string) {
  const session = await requireAuth();
  if (session.user.role !== role) {
    throw new Error("Forbidden");
  }
  return session;
}

export function handleApiError(error: unknown): NextResponse<ApiResponse> {
  console.error("API Error:", error);
  if (error instanceof ZodError) {
    return apiError("Validation failed", "VALIDATION_ERROR", 400);
  }
  if (error instanceof Error) {
    if (error.message === "Unauthorized") {
      return apiError("Authentication required", "UNAUTHORIZED", 401);
    }
    if (error.message === "Forbidden") {
      return apiError("You do not have permission to perform this action", "FORBIDDEN", 403);
    }
    return apiError(error.message, "INTERNAL_ERROR", 500);
  }
  return apiError("An unexpected error occurred", "INTERNAL_ERROR", 500);
}
