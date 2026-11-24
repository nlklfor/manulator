import { ApiError, apiFetch } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";

const SUMMARIZE_ENDPOINT = "/api/summarize-manuscripts";

export interface ManuscriptSummaryResponse {
  manuscript_id: string;
  summary: string;
  status: "summarized";
}

// Summarizes the saved translation of the page; the backend saves the summary.
// Throws an Error with a message for the user if it failed.
export async function summarizeManuscript(manuscriptId: string): Promise<string> {
  try {
    const response = await apiFetch<ManuscriptSummaryResponse>(
      `${SUMMARIZE_ENDPOINT}/${encodeURIComponent(manuscriptId)}`,
      { method: "POST", headers: { Authorization: `Bearer ${getAuthToken()}` } },
    );
    return response.summary;
  } catch (error) {
    throw new Error(summaryErrorMessage(error));
  }
}

function summaryErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Could not reach the server. Check your connection and try again.";
  }
  switch (error.status) {
    case 401:
      return "Your session has expired. Please log in again.";
    case 404:
      return "This page was not found. It may have been deleted.";
    case 409:
      return "Translate the page first. The summary is made from the translation.";
    case 502:
      return "The summary service is not available right now. Please try again later.";
    default:
      return "Could not summarize the page. Please try again.";
  }
}
