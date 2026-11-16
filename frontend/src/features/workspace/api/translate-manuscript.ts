import { ApiError, apiFetch } from "@/lib/api/client";
import { getAuthToken } from "@/lib/auth/session";

const TRANSLATE_ENDPOINT = "/api/translate-manuscripts";

// "text": the whole text is translated at once, "sentence": sentence by sentence
export type TranslationType = "text" | "sentence";

export const TRANSLATION_TYPES: { id: TranslationType; label: string }[] = [
  { id: "text", label: "Whole text" },
  { id: "sentence", label: "Sentence by sentence" },
];

// What the backend should do: only "Translate" to English is supported for now
export interface TranslationPlan {
  plan: "Translate";
  target_language: "en";
  translation_type: TranslationType;
}

export function translationPlan(translationType: TranslationType = "text"): TranslationPlan {
  return { plan: "Translate", target_language: "en", translation_type: translationType };
}

export interface ManuscriptTranslationResponse {
  manuscript_id: string;
  translated_lines: { index: number; text: string }[];
  success: boolean;
  message: string | null;
}

// A finished translation, as the page shows it
export interface Translation {
  type: TranslationType;
  parts: string[]; // the translated sentences (or lines) in reading order
}

export function toTranslationParts(response: ManuscriptTranslationResponse): string[] {
  return [...response.translated_lines]
    .sort((a, b) => a.index - b.index)
    .map((line) => line.text.trim())
    .filter(Boolean);
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
  return { type: plan.translation_type, parts };
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
