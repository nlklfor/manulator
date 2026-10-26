import { apiFetch } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import type { UploadDetails } from "./uploadImage";

const MANUSCRIPTS_ENDPOINT = "/api/upload-manuscripts";

// What the backend saved (it trims the text)
export interface UpdateResponse {
  id: string;
  title: string;
  document_type: string;
}

// Changes the name and the document type of a manuscript.
// Throws an ApiError when the backend refuses (e.g. 404 or 422).
export async function updateManuscript(
  manuscriptId: string,
  details: UploadDetails,
): Promise<UpdateResponse> {
  return apiFetch<UpdateResponse>(`${MANUSCRIPTS_ENDPOINT}/${encodeURIComponent(manuscriptId)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${getAuthToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title: details.title, document_type: details.documentType }),
  });
}
