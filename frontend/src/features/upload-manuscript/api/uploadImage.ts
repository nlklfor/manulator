import { apiFetch } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import type { PageClasses } from "./classifyPage";

const UPLOAD_ENDPOINT = "/api/upload-manuscripts";

export interface UploadResponse extends PageClasses {
  id: string; // manuscript id, used to delete it
  title: string;
  document_type: string;
  filename: string;
  content_type: string;
  size: number;
  url: string; // temporary link to the file
}

// What the user fills in (or checks) in the upload and the edit form.
// An empty class ("") is saved as unknown.
export interface UploadDetails {
  title: string;
  documentType: string; // e.g. "Charter", "Register", "Letter"
  century: string;
  script: string;
  language: string;
  region: string;
}

export async function uploadImage(file: File, details: UploadDetails): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", details.title);
  formData.append("document_type", details.documentType);
  formData.append("century", details.century);
  formData.append("script", details.script);
  formData.append("language", details.language);
  formData.append("region", details.region);

  return apiFetch<UploadResponse>(UPLOAD_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${getAuthToken()}` },
    body: formData,
  });
}
