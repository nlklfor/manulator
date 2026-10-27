import { ApiError, apiFetch } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import type { TranscribedLine } from "@/features/upload-manuscript/types/upload";

const TRANSCRIBE_ENDPOINT = "/api/process-manuscripts/";

export interface ManuscriptProcessPlan {
  steps: string[] | null;
  plan: string;
  options: Record<string, string> | null;
}

export interface ProcessResultData {
  "Detect Lines"?: { lines: Omit<TranscribedLine, "text">[] };
  Transcribe?: { lines: { index: number; text: string }[] };
}

export interface ManuscriptProcessResponse {
  manuscript_id: string;
  overlay: string; // JPEG data URL with the lines drawn on the page
  data: ProcessResultData;
  success: boolean;
  message: string | null;
}

export async function processManuscript(
  manuscriptId: string,
  processPlan: ManuscriptProcessPlan,
): Promise<ManuscriptProcessResponse> {
  // get the current auth token to include in the request headers
  const authToken = getAuthToken();

  try {
    // convert the process plan to a JSON string for the request body
    const body = JSON.stringify(processPlan);
    // send a POST request to the transcription endpoint with the manuscript ID and process plan
    const response = await apiFetch<ManuscriptProcessResponse>(
      `${TRANSCRIBE_ENDPOINT}${manuscriptId}`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + authToken,
          "Content-Type": "application/json",
        },
        body: body,
      },
    );

    if (response.success) {
      return response;
    } else {
      return {
        manuscript_id: manuscriptId,
        overlay: "",
        data: {},
        success: false,
        message: response.message,
      };
    }
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        throw new Error("Unauthorized: Invalid or expired token.");
      } else if (error.status === 500) {
        throw new Error("We could not process the manuscript. Please try again.");
      } else if (error.status === 422) {
        throw new Error(`Invalid process plan: ${error.status}`);
      }
    }
    throw error;
  }
}
