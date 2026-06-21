export type ApiResponse<T = unknown> = {
  data: T | null;
  error: { message: string; code: string } | null;
  meta?: Record<string, unknown>;
};

export interface TimeEntryWithRelations {
  id: string;
  userId: string;
  projectId: string;
  subTaskId: string;
  checkInAt: string;
  checkOutAt: string | null;
  durationMinutes: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string; color: string; status: string };
  subTask: { id: string; name: string; status: string };
  user?: { id: string; name: string; email: string; avatarUrl: string | null };
}
