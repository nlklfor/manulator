import type { Metadata } from "next";
import AuthHeading from "@/features/auth/components/AuthHeading";
import RegistrationForm from "@/features/auth/components/RegistrationForm";

export const metadata: Metadata = {
  title: "Create account",
};

export default function RegisterPage() {
  return (
    <>
      <AuthHeading
        title="Create your account"
        description="Upload scans, transcribe them and keep your corrections in one place."
      />
      <RegistrationForm />
    </>
  );
}
