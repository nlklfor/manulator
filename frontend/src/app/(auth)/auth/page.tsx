import type { Metadata } from "next";
import AuthForm from "@/features/auth/components/AuthForm";
import AuthHeading from "@/features/auth/components/AuthHeading";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function AuthPage({ searchParams }: PageProps<"/auth">) {
  const { registered } = await searchParams;

  return (
    <>
      <AuthHeading title="Sign in" description="Welcome back. Pick up where you left off." />
      <AuthForm registrationSuccess={registered === "1"} />
    </>
  );
}
