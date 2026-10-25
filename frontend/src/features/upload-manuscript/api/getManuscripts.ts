import { apiFetch } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import type { PageStatus } from "../types/upload";
import type { UploadResponse } from "./uploadImage";

const MANUSCRIPTS_ENDPOINT = "/api/upload-manuscripts";

export interface ManuscriptResponse extends UploadResponse {
  status: PageStatus | "uploading";
  created_at: string;
  // Filled once the page is transcribed, otherwise null
  transcription: TranscribedLine[] | null;
  overlay_url: string | null; // page with the lines drawn on it, valid 1 day
}

export interface TranscribedLine {
  index: number; // line number, starting at 0
  text: string;
  bbox?: [number, number, number, number]; // x0, y0, x1, y1
  baseline?: [number, number][];
  boundary?: [number, number][];
}

export async function getManuscripts(): Promise<ManuscriptResponse[]> {
  return apiFetch<ManuscriptResponse[]>(MANUSCRIPTS_ENDPOINT, {
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
}
