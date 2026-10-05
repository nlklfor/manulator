import OtpForm from "@/features/auth/components/OtpForm";

//  /auth/verify?email=mahadi@example.com&purpose=reset
export default async function VerifyPage({ searchParams }: PageProps<"/auth/verify">) {
  const { email, purpose } = await searchParams;
  const userEmail = typeof email === "string" ? email : "";

  return (
    <>
      <h1 className="text-2xl font-semibold text-mt-text">Check your email</h1>
      <p className="mt-1 text-sm text-mt-text-muted">
        We sent a 6-digit code to <span className="font-medium text-mt-text">{userEmail}</span>.
      </p>
      <OtpForm email={userEmail} purpose={purpose === "reset" ? "reset" : "register"} />
    </>
  );
}
