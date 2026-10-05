import AuthForm from "@/features/auth/components/AuthForm";

export default function AuthPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold text-mt-text">Sign in</h1>
      <p className="mt-1 text-sm text-mt-text-muted">Welcome back. Pick up where you left off.</p>
      <AuthForm />
    </>
  );
}
