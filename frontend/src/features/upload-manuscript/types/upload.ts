export type UploadErrorReason = "invalid-type" | "file-too-large";

export interface UploadError {
  fileName: string;
  reason: UploadErrorReason;
  message: string;
}

export interface SelectedFile {
  file: File;
  previewUrl: string;
}
