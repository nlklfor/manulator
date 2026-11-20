"use client";

// ClassFields — the classes of a page (document type, century, script, language, region),
// shared by the upload and the edit form. They can all be typed freely; document type and
// script offer suggestions. Document type is required, the others may stay empty (= unknown).
import TextField from "@/features/auth/components/TextField";
import type { UploadDetails } from "../api/uploadImage";
import { DOCUMENT_TYPES } from "../constants/documentTypes";
import { SCRIPTS } from "../constants/scripts";

export type ClassName = "documentType" | "century" | "script" | "language" | "region";
export type ClassValues = Pick<UploadDetails, ClassName>;

export const EMPTY_CLASSES: ClassValues = {
  documentType: "",
  century: "",
  script: "",
  language: "",
  region: "",
};

const FIELDS: {
  name: ClassName;
  label: string;
  placeholder: string;
  suggestions?: string[];
}[] = [
  {
    name: "documentType",
    label: "Document type",
    placeholder: "e.g. Charter",
    suggestions: DOCUMENT_TYPES,
  },
  { name: "century", label: "Century", placeholder: "e.g. 13th century" },
  { name: "script", label: "Script", placeholder: "e.g. Textualis", suggestions: SCRIPTS },
  { name: "language", label: "Language", placeholder: "e.g. Latin" },
  { name: "region", label: "Region", placeholder: "e.g. Upper Rhine" },
];

interface ClassFieldsProps {
  idPrefix: string; // keeps the ids unique when both forms exist on one page
  values: ClassValues;
  onChange: (name: ClassName, value: string) => void;
  disabled?: boolean;
}

export function ClassFields({ idPrefix, values, onChange, disabled }: ClassFieldsProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {FIELDS.map(({ name, label, placeholder, suggestions }) => (
        // Document type is the most important class, so it gets the full width
        <div key={name} className={name === "documentType" ? "col-span-2" : undefined}>
          <TextField
            id={`${idPrefix}-${name}`}
            name={name}
            label={label}
            required={name === "documentType"}
            maxLength={name === "documentType" ? 50 : 100}
            placeholder={placeholder}
            value={values[name]}
            onChange={(event) => onChange(name, event.target.value)}
            disabled={disabled}
            list={suggestions && `${idPrefix}-${name}-options`}
          />
          {suggestions && (
            <datalist id={`${idPrefix}-${name}-options`}>
              {suggestions.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          )}
        </div>
      ))}
    </div>
  );
}
