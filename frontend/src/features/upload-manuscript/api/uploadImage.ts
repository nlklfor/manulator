import { apiFetch } from "@/lib/api/client";

// Placeholder endpoint for uploading images, should be replaced with actual endpoint when available
const UPLOAD_ENDPOINT = "/api/upload-manuscript";

export async function uploadImage(file: File): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  await apiFetch(UPLOAD_ENDPOINT, {
    method: "POST",
    body: formData,
  });
}
