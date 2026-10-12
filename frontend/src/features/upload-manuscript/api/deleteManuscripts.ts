import { ApiError, apiFetch } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";

const MANUSCRIPTS_ENDPOINT = "/api/upload-manuscripts";

export interface DeleteManuscriptResult {
  success: boolean;
  message: string;
}

export async function deleteManuscript(manuscriptId: string): Promise<DeleteManuscriptResult> {
  try {
    await apiFetch<void>(`${MANUSCRIPTS_ENDPOINT}/${encodeURIComponent(manuscriptId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getAuthToken()}` },
    });
    return { success: true, message: "Manuscript deleted" };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return { success: false, message: "Manuscript not found" };
    }
    return { success: false, message: "Could not delete the manuscript. Please try again." };
  }
}
