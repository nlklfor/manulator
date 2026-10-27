// Folders of the library: manuscripts are grouped by their document type.
// Every suggested document type is a folder. Anything else a user typed
// (e.g. "Sermon") is shown in the "Other" folder, but keeps its own name on the card.
import { DOCUMENT_TYPES } from "./documentTypes";

export const OTHER_FOLDER = "Other";

// Colour of each folder (small square in the sidebar and on the cards)
const FOLDER_COLORS: Record<string, string> = {
  Charter: "#B0562B",
  Register: "#4F5D75",
  Letter: "#A34A6E",
  Cartulary: "#7A4E2D",
  Chronicle: "#3E7C5A",
  Other: "#8A8478",
};

export interface Folder {
  name: string;
  color: string;
  count: number;
}

// The folder a document type belongs to: the suggestion it matches (any capitalisation),
// or "Other" when it is a type the user typed themselves.
export function folderOf(documentType: string): string {
  const typed = documentType.trim().toLowerCase();
  return DOCUMENT_TYPES.find((type) => type.toLowerCase() === typed) ?? OTHER_FOLDER;
}

// Reads the folder from the address (?type=Charter). Returns null when there is none
// or it is not a folder, so a wrong address simply shows everything.
export function parseFolder(value: string | null): string | null {
  const typed = value?.trim().toLowerCase();
  if (!typed) return null;
  return DOCUMENT_TYPES.find((type) => type.toLowerCase() === typed) ?? null;
}

export function folderColor(folder: string): string {
  return FOLDER_COLORS[folder] ?? FOLDER_COLORS[OTHER_FOLDER];
}

// The folders that contain at least one manuscript, in the order of the suggestions
export function getFolders(entries: { documentType: string }[]): Folder[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const folder = folderOf(entry.documentType);
    counts.set(folder, (counts.get(folder) ?? 0) + 1);
  }
  return DOCUMENT_TYPES.filter((name) => counts.has(name)).map((name) => ({
    name,
    color: folderColor(name),
    count: counts.get(name) ?? 0,
  }));
}
