import type { Metadata } from "next";
import AuthHeading from "@/features/auth/components/AuthHeading";
import ResetPasswordForm from "@/features/auth/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset password",
};

// Opened from the email link: /auth/reset-password#access_token=...&type=recovery
export default function ResetPasswordPage() {
  return (
    <>
      <AuthHeading title="Reset password" description="Choose a new password for your account." />
      <ResetPasswordForm />
    </>
  );
}
