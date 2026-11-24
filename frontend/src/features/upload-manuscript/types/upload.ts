export type UploadErrorReason = "invalid-type" | "file-too-large";
// Pages move through uploading → uploaded → transcribing → transcribed → corrected
// → translating → translated → summarizing → summarized. The backend saves the finished
// steps; the "…ing" steps are shown while a step runs.
export type PageStatus =
  | "uploaded"
  | "transcribing"
  | "transcribed"
  | "corrected"
  | "translating"
  | "translated"
  | "summarizing"
  | "summarized";
export type UploadStatus = "uploading" | "upload-failed" | PageStatus;
export type StatusFilter = "all" | PageStatus;

export interface UploadError {
  fileName: string;
  reason: UploadErrorReason;
  message: string;
}

export interface LibraryEntry {
  id: string;
  fileName: string; // the title of the manuscript
  documentType: string; // e.g. "Charter", "Letter"
  // Classes of the page, checked by the user at upload; null = unknown
  century?: string | null; // e.g. "13th century"
  script?: string | null; // e.g. "Textualis"
  language?: string | null; // e.g. "Latin"
  region?: string | null; // e.g. "Upper Rhine"
  fileType: string;
  previewUrl: string;
  status: UploadStatus;
  transcription?: TranscribedLine[] | null;
  translation?: SavedTranslation | null; // filled once the page is translated
  summary?: string | null; // filled once the translation is summarized
  pipelineError?: string | null; // why the automatic pipeline stopped, if it did
}

// A translation as the backend saves it: how it was made and the translated parts
export interface SavedTranslation {
  type: "full" | "sentences" | "lines";
  lines: { index: number; text: string }[];
}

// One line of a saved transcription, as the backend sends it.
export interface TranscribedLine {
  index: number; // line number, starting at 0 (reading order)
  text: string;
  original_text?: string; // the model's reading, only set while the user's correction differs from it
  bbox?: [number, number, number, number];
  baseline?: [number, number][];
  boundary?: [number, number][];
}
