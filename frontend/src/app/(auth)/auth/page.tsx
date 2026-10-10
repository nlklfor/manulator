import type { Metadata } from "next";
import { cookies } from "next/headers";
import AuthForm from "@/features/auth/components/AuthForm";
import AuthHeading from "@/features/auth/components/AuthHeading";
import { LOGOUT_MESSAGE_COOKIE_NAME } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function AuthPage({ searchParams }: PageProps<"/auth">) {
  const { registered } = await searchParams;
  // Set by useLogout right before it redirects here
  const logoutMessage = (await cookies()).get(LOGOUT_MESSAGE_COOKIE_NAME)?.value ?? null;

  return (
    <>
      <AuthHeading title="Sign in" description="Welcome back. Pick up where you left off." />
      <AuthForm registrationSuccess={registered === "1"} logoutMessage={logoutMessage} />
    </>
  );
}
