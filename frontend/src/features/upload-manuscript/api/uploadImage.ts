import { apiFetch } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";

const UPLOAD_ENDPOINT = "/api/upload-manuscripts";

export interface UploadResponse {
  id: string; // manuscript id, used to delete it
  title: string;
  document_type: string;
  filename: string;
  content_type: string;
  size: number;
  url: string; // temporary link to the file
}

export interface UploadDetails {
  title: string;
  documentType: string; // e.g. "Charter", "Register", "Letter"
}

export async function uploadImage(file: File, details: UploadDetails): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", details.title);
  formData.append("document_type", details.documentType);

  return apiFetch<UploadResponse>(UPLOAD_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${getAuthToken()}` },
    body: formData,
  });
}
