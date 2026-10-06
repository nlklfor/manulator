"use client";

import { useState, type ComponentProps } from "react";
import TextField from "@/features/auth/components/TextField";

type PasswordFieldProps = Omit<ComponentProps<typeof TextField>, "type" | "endAdornment">;

export default function PasswordField(props: PasswordFieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const fieldName = props.label.toLowerCase();

  return (
    <TextField
      {...props}
      type={isVisible ? "text" : "password"}
      endAdornment={
        <button
          type="button"
          onClick={() => setIsVisible((visible) => !visible)}
          aria-label={isVisible ? `Hide ${fieldName}` : `Show ${fieldName}`}
          aria-controls={props.id}
          className="absolute inset-y-0 right-0 px-3 text-sm text-mt-text hover:text-mt-accent-hover"
        >
          {isVisible ? "Hide" : "Show"}
        </button>
      }
    />
  );
}
