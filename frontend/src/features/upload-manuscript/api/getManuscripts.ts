import { apiFetch } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import type { PageStatus } from "../types/upload";
import type { UploadResponse } from "./uploadImage";

const MANUSCRIPTS_ENDPOINT = "/api/upload-manuscripts";

export interface ManuscriptResponse extends UploadResponse {
  status: PageStatus | "uploading";
  created_at: string;
}

export async function getManuscripts(): Promise<ManuscriptResponse[]> {
  return apiFetch<ManuscriptResponse[]>(MANUSCRIPTS_ENDPOINT, {
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
}
