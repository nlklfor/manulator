import type { LibraryEntry } from "../types/upload";
import { ManuscriptCard } from "./ManuscriptCard";

interface ManuscriptLibraryProps {
  entries: LibraryEntry[];
  onDeleted: (id: string, success: boolean, message: string) => void;
}

export function ManuscriptLibrary({ entries, onDeleted }: ManuscriptLibraryProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {entries.map((entry) => (
        <ManuscriptCard key={entry.id} entry={entry} onDeleted={onDeleted} />
      ))}
    </div>
  );
}
