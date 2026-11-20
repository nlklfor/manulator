import { apiFetch } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import type { PageStatus, SavedTranslation, TranscribedLine } from "../types/upload";

const MANUSCRIPTS_ENDPOINT = "/api/upload-manuscripts";

// The full pipeline runs in the backend after an upload: transcribe, translate sentence by
// sentence, summarize. Each step saves its result and status; the page polls the progress.
export interface PipelineProgress {
  manuscript_id: string;
  status: PageStatus; // "transcribing", "translating" or "summarizing" while a step runs
  transcription: TranscribedLine[] | null;
  translation: SavedTranslation | null;
  summary: string | null;
  error: string | null; // why the last run stopped, if it did
}

// Steps of the pipeline that are still running
export const PIPELINE_RUNNING: PageStatus[] = ["transcribing", "translating", "summarizing"];

export function isStepRunning(status: string): boolean {
  return (PIPELINE_RUNNING as string[]).includes(status);
}

function authHeaders() {
  return { Authorization: `Bearer ${getAuthToken()}` };
}

// Starts the pipeline; answers at once, before the first step is done
export async function startPipeline(manuscriptId: string): Promise<PipelineProgress> {
  return apiFetch<PipelineProgress>(
    `${MANUSCRIPTS_ENDPOINT}/${encodeURIComponent(manuscriptId)}/pipeline`,
    { method: "POST", headers: authHeaders() },
  );
}

export async function getPipelineProgress(manuscriptId: string): Promise<PipelineProgress> {
  return apiFetch<PipelineProgress>(
    `${MANUSCRIPTS_ENDPOINT}/${encodeURIComponent(manuscriptId)}/progress`,
    { headers: authHeaders() },
  );
}
