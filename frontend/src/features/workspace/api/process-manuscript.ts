import { ApiError, apiFetch } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";

const TRANSCRIBE_ENDPOINT = "/api/process-manuscripts/";

export interface ManuscriptProcessPlan {
  manuscriptId: string;
  steps: string[];
  plan: string;
  options: Record<string, any>;
}

export interface ManuscriptProcessResponse {
  manuscriptId: string;
  overlay: string;
  data: Record<any, any>;
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
        manuscriptId,
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
