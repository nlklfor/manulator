import { apiFetch } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";

const CLASSIFY_ENDPOINT = "/api/upload-manuscripts/classify";

// Classes of a page: suggested by the classifier, then checked and edited by the user.
// null = unknown (the classifier could not tell, or the user left it empty).
export interface PageClasses {
  document_type: string | null; // e.g. "Charter"
  century: string | null; // e.g. "13th century"
  script: string | null; // e.g. "Textualis"
  language: string | null; // e.g. "Latin"
  region: string | null; // e.g. "Upper Rhine"
}

// Asks the backend what kind of page this is. The upload form shows the
// suggestions so the user can check and edit them. Throws an ApiError when it fails.
export async function classifyPage(file: File, signal?: AbortSignal): Promise<PageClasses> {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<PageClasses>(CLASSIFY_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${getAuthToken()}` },
    body: formData,
    signal,
  });
}
