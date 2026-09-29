import { apiFetch } from "@/lib/api/client";

const UPLOAD_ENDPOINT = "/api/upload-manuscripts";

export interface UploadResponse {
  id: string;
  filename: string;
  content_type: string;
  size: number;
}

export async function uploadImage(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  return apiFetch<UploadResponse>(UPLOAD_ENDPOINT, {
    method: "POST",
    body: formData,
  });
}
