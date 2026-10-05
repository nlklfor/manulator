export type OtpPurpose = "register" | "reset";

const DUMMY_CODE = "123456";
// 1-minute expiry
export const OTP_TTL_MS = 60_000;

export async function verifyOtp(email: string, code: string): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return code === DUMMY_CODE;
}

// Returns when the new code expires (ms timestamp).
export async function resendOtp(email: string): Promise<number> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  console.info(`code ${DUMMY_CODE} sent to ${email}`);
  return Date.now() + OTP_TTL_MS;
}
