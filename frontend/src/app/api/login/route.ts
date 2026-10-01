import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/auth/session";

/**
 * Dummy login endpoint: accepts any credentials and starts a session.
 *
 * TODO: replace the body of this handler with a call to the real auth backend
 * and store the token it returns. The cookie contract stays the same, so the
 * proxy and client code do not need to change.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "dummy-session", SESSION_COOKIE_OPTIONS);
  return response;
}
