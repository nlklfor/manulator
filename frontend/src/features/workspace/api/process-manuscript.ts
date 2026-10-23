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
}

export async function processManuscript(
  manuscriptId: string,
  processPlan: ManuscriptProcessPlan,
): Promise<ManuscriptProcessPlanData> {
  // get the current auth token to include in the request headers
  const authToken = getAuthToken();

  try {
    const body = JSON.stringify(processPlan);

    const response = await apiFetch<ManuscriptProcessResponse>(`${TRANSCRIBE_ENDPOINT}${manuscriptId}`, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + authToken,
        "Content-Type": "application/json",
      },
      body: body,
    });

    if (response.success) {
      return response;
    } else {

    }
  } catch (error) {
    if (error instanceof ApiError) {

    }
    throw error;
  }
}
