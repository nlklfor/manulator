import type { PageStatus, UploadStatus } from "../types/upload";

export const STATUS_LABELS: Record<UploadStatus, string> = {
  uploading: "Uploading",
  "upload-failed": "Upload failed",
  uploaded: "Uploaded",
  transcribing: "Transcribing",
  transcribed: "Transcribed",
  corrected: "Corrected",
};

export const FILTER_STATUSES: PageStatus[] = [
  "uploaded",
  "transcribing",
  "transcribed",
  "corrected",
];
