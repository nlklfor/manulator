import type { TranscribedLine } from "@/features/upload-manuscript/types/upload";
import type { ProcessResultData } from "./api/process-manuscript";
import type { TranscriptionLine } from "./types";

// Saved lines -> displayed lines, in reading order (the order of the detected lines)
export function toTranscriptionLines(
  transcription: TranscribedLine[] | null | undefined,
): TranscriptionLine[] {
  if (!transcription) return [];
  return [...transcription]
    .sort((a, b) => a.index - b.index)
    .map((line) => ({
      n: line.index + 1,
      text: line.text,
      // PyLaia does not report a confidence yet
      confidence: null,
      lowConfWords: [],
      boundary: line.boundary ?? [],
    }));
}

export function mergeProcessResult(data: ProcessResultData): TranscribedLine[] {
  const positions = new Map((data["Detect Lines"]?.lines ?? []).map((l) => [l.index, l]));
  return (data.Transcribe?.lines ?? []).map((line) => ({
    ...positions.get(line.index),
    ...line,
  }));
}
