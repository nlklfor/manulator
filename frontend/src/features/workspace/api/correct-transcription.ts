import { ApiError, apiFetch } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";
import type { TranscriptionLine } from "../types";

const CORRECT_ENDPOINT = "/api/correct-manuscripts";

// One change of a single character, as the correction model reports it.
// start / end are positions in the trimmed line; an insertion has start === end.
export interface CharacterCorrection {
  type: "substitution" | "deletion" | "insertion";
  original: string;
  corrected: string;
  start: number;
  end: number;
}

export interface LineCorrectionResult {
  original: string;
  corrected: string;
  corrections: CharacterCorrection[];
  confidence: number;
}

export interface ManuscriptCorrectionResponse {
  manuscript_id: string;
  // keyed by the line index (starting at 0); empty lines are left out
  corrected_lines: Record<string, LineCorrectionResult>;
  success: boolean;
  message: string | null;
}

// One word (or a few words, if the model joins or splits them) the model would change.
// start / end are positions in the line's current text.
export interface CorrectionSuggestion {
  id: string;
  lineN: number;
  start: number;
  end: number;
  original: string;
  suggested: string;
}

// Runs the correction model on the saved transcription.
export async function correctTranscription(
  manuscriptId: string,
  lines: TranscriptionLine[],
): Promise<CorrectionSuggestion[]> {
  let response: ManuscriptCorrectionResponse;
  try {
    response = await apiFetch<ManuscriptCorrectionResponse>(
      `${CORRECT_ENDPOINT}/${encodeURIComponent(manuscriptId)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          "Content-Type": "application/json",
        },
        // The backend reads the lines from the database, so none are sent
        body: JSON.stringify({
          manuscript_id: manuscriptId,
          lines: [],
          plan: "Correct",
          type: "lines",
        }),
      },
    );
  } catch (error) {
    throw new Error(correctionErrorMessage(error));
  }

  if (!response.success) {
    throw new Error(response.message || "The correction model could not check this page.");
  }
  return toSuggestions(response, lines);
}

// Character changes -> word suggestions. Changes that touch the same word (or the space
// between two words) are joined into one suggestion, so the user decides per word.
export function toSuggestions(
  response: ManuscriptCorrectionResponse,
  lines: TranscriptionLine[],
): CorrectionSuggestion[] {
  const suggestions: CorrectionSuggestion[] = [];
  for (const [key, result] of Object.entries(response.corrected_lines ?? {})) {
    const lineN = Number(key) + 1;
    const line = lines.find((l) => l.n === lineN);
    if (!line || !result.corrections?.length) continue;

    const trimmed = line.text.trim();
    if (trimmed !== result.original) continue;
    const offset = line.text.length - line.text.trimStart().length;

    for (const group of groupByWord(trimmed, result.corrections)) {
      const original = trimmed.slice(group.start, group.end);
      const suggested = applyCorrections(original, group.corrections, group.start);
      if (suggested === original) continue;
      suggestions.push({
        id: `${lineN}:${group.start + offset}`,
        lineN,
        start: group.start + offset,
        end: group.end + offset,
        original,
        suggested,
      });
    }
  }
  return suggestions.sort((a, b) => a.lineN - b.lineN || a.start - b.start);
}

interface CorrectionGroup {
  start: number;
  end: number;
  corrections: CharacterCorrection[];
}

function groupByWord(text: string, corrections: CharacterCorrection[]): CorrectionGroup[] {
  const words = [...text.matchAll(/\S+/g)].map((m) => ({
    start: m.index,
    end: m.index + m[0].length,
  }));
  const groups: CorrectionGroup[] = [];

  for (const correction of corrections) {
    const touched = words.filter((w) => w.start <= correction.end && w.end >= correction.start);
    if (touched.length === 0) continue;
    const start = touched[0].start;
    const end = touched[touched.length - 1].end;

    const last = groups[groups.length - 1];
    if (last && start <= last.end) {
      last.end = Math.max(last.end, end);
      last.corrections.push(correction);
    } else {
      groups.push({ start, end, corrections: [correction] });
    }
  }
  return groups;
}

// Applies the changes in order; `base` is where `text` starts in the line
function applyCorrections(text: string, corrections: CharacterCorrection[], base: number): string {
  let result = "";
  let cursor = 0;
  for (const c of [...corrections].sort((a, b) => a.start - b.start)) {
    const start = c.start - base;
    result += text.slice(cursor, start) + c.corrected;
    cursor = c.end - base;
  }
  return result + text.slice(cursor);
}

function correctionErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Could not reach the server. Check your connection and try again.";
  }
  switch (error.status) {
    case 401:
      return "Your session has expired. Please log in again.";
    case 404:
      return "This page has no transcription to check. Please transcribe it first.";
    case 502:
      return "The correction service is not available right now. Please try again later.";
    default:
      return "Please try again.";
  }
}
