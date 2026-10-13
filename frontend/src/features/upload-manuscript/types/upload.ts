export type UploadErrorReason = "invalid-type" | "file-too-large";
// Pages move through uploading → uploaded → transcribing → transcribed → corrected
export type PageStatus = "uploaded" | "transcribing" | "transcribed" | "corrected";
export type UploadStatus = "uploading" | "upload-failed" | PageStatus;
export type StatusFilter = "all" | PageStatus;

export interface UploadError {
  fileName: string;
  reason: UploadErrorReason;
  message: string;
}

export interface LibraryEntry {
  id: string;
  fileName: string;
  fileType: string;
  previewUrl: string;
  status: UploadStatus;
}
