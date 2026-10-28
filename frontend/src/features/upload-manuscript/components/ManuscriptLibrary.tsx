import type { LibraryEntry } from "../types/upload";
import type { UploadDetails } from "../api/uploadImage";
import { ManuscriptCard } from "./ManuscriptCard";

interface ManuscriptLibraryProps {
  entries: LibraryEntry[];
  onDeleted: (id: string, success: boolean, message: string) => void;
  onEdit: (id: string, details: UploadDetails) => Promise<void>;
}

export function ManuscriptLibrary({ entries, onDeleted, onEdit }: ManuscriptLibraryProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {entries.map((entry) => (
        <ManuscriptCard key={entry.id} entry={entry} onDeleted={onDeleted} onEdit={onEdit} />
      ))}
    </div>
  );
}
