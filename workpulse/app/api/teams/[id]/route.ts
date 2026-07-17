import { apiError } from "@/lib/api-utils";
export const runtime = "nodejs";


export async function GET() {
  return apiError("Teams have been removed", "GONE", 410);
}

export async function POST() {
  return apiError("Teams have been removed", "GONE", 410);
}

export async function PATCH() {
  return apiError("Teams have been removed", "GONE", 410);
}

export async function DELETE() {
  return apiError("Teams have been removed", "GONE", 410);
}
