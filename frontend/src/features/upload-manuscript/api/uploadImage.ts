import { apiFetch } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";

const UPLOAD_ENDPOINT = "/api/upload-manuscripts";

export interface UploadResponse {
  id: string; // storage path
  filename: string;
  content_type: string;
  size: number;
  url: string; // temporary link to the file
}

export async function uploadImage(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<UploadResponse>(UPLOAD_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${getAuthToken()}` },
    body: formData,
  });
}
