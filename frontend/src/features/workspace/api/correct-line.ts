import { ApiError, apiFetch } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";

const MANUSCRIPTS_ENDPOINT = "/api/upload-manuscripts";

// What the backend saved: show this text, not the one that was sent
export interface LineCorrectionResponse {
  manuscript_id: string;
  index: number;
  text: string;
  status: "corrected";
}

// Saves the corrected text of one line. Resolves only after the backend has stored it.
export async function saveLineCorrection(
  manuscriptId: string,
  lineIndex: number,
  text: string,
): Promise<LineCorrectionResponse> {
  try {
    return await apiFetch<LineCorrectionResponse>(
      `${MANUSCRIPTS_ENDPOINT}/${encodeURIComponent(manuscriptId)}/lines/${lineIndex}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      },
    );
  } catch (error) {
    throw new Error(correctionErrorMessage(error));
  }
}

function correctionErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Could not reach the server. Check your connection and try again.";
  }
  switch (error.status) {
    case 401:
      return "Your session has expired. Please log in again.";
    case 404:
      return "This line or manuscript no longer exists. Please reload the page.";
    case 409:
      return "This page has not been transcribed yet.";
    case 422:
      return typeof error.detail === "string" ? error.detail : "The correction is not valid.";
    default:
      return "Could not save the correction. Please try again.";
  }
}
