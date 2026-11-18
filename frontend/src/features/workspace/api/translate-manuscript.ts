import { ApiError, apiFetch } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";

const TRANSLATE_ENDPOINT = "/api/translate-manuscripts";

// How the ML service translates:
//   "full"      -> the whole text at once (LLM), returned as one part
//   "sentences" -> sentence by sentence, one part per sentence
//   "lines"     -> line by line, one part per transcribed line
export type TranslationType = "full" | "sentences" | "lines";

export const TRANSLATION_TYPES: { id: TranslationType; label: string }[] = [
  { id: "full", label: "Whole text" },
  { id: "sentences", label: "Sentence by sentence" },
  { id: "lines", label: "Line by line" },
];

// What the backend should do: only "Translate" to English is supported for now
export interface TranslationPlan {
  plan: "Translate";
  target_language: "English";
  type: TranslationType;
}

export function translationPlan(type: TranslationType = "full"): TranslationPlan {
  return { plan: "Translate", target_language: "English", type };
}

export interface ManuscriptTranslationResponse {
  manuscript_id: string;
  translated_lines: { index: number; text: string }[];
  success: boolean;
  message: string | null;
}

// One translated part: the whole text, a sentence or a line
export interface TranslationPart {
  n: number;
  text: string;
}

// A finished translation, as the page shows it
export interface Translation {
  type: TranslationType;
  parts: TranslationPart[];
}

export function toTranslationParts(response: ManuscriptTranslationResponse): TranslationPart[] {
  return [...response.translated_lines]
    .sort((a, b) => a.index - b.index)
    .map((part) => ({ n: part.index + 1, text: part.text.trim() }))
    .filter((part) => part.text);
}

// Translates the transcribed page. Resolves with the translation, throws an Error
// with a message for the user if the translation failed.
export async function translateManuscript(
  manuscriptId: string,
  plan: TranslationPlan = translationPlan(),
): Promise<Translation> {
  let response: ManuscriptTranslationResponse;
  try {
    response = await apiFetch<ManuscriptTranslationResponse>(
      `${TRANSLATE_ENDPOINT}/${encodeURIComponent(manuscriptId)}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(plan),
      },
    );
  } catch (error) {
    throw new Error(translationErrorMessage(error));
  }

  const parts = response.success ? toTranslationParts(response) : [];
  if (parts.length === 0) {
    throw new Error(
      response.message || "The model could not translate this page. Please try again.",
    );
  }
  return { type: plan.type, parts };
}

function translationErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Could not reach the server. Check your connection and try again.";
  }
  switch (error.status) {
    case 400:
      return typeof error.detail === "string" ? error.detail : "This translation is not supported.";
    case 401:
      return "Your session has expired. Please log in again.";
    case 404:
      return "This page has no transcription to translate. Please transcribe it first.";
    case 502:
      return "The translation service is not available right now. Please try again later.";
    default:
      return "Could not translate the page. Please try again.";
  }
}
