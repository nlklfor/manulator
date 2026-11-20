import type { PageStatus, UploadStatus } from "../types/upload";

export const STATUS_LABELS: Record<UploadStatus, string> = {
  uploading: "Uploading",
  "upload-failed": "Upload failed",
  uploaded: "Uploaded",
  transcribing: "Transcribing",
  transcribed: "Transcribed",
  corrected: "Corrected",
  translating: "Translating",
  translated: "Translated",
  summarizing: "Summarizing",
  summarized: "Summarized",
};

// The page has a transcription (it may also be translated and summarized)
export function hasTranscription(status: UploadStatus): boolean {
  return [
    "transcribed",
    "corrected",
    "translating",
    "translated",
    "summarizing",
    "summarized",
  ].includes(status);
}

export const FILTER_STATUSES: PageStatus[] = [
  "uploaded",
  "transcribing",
  "transcribed",
  "corrected",
  "translated",
  "summarized",
];
