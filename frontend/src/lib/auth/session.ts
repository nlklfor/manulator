export const SESSION_COOKIE_NAME = "session";

/**
 * Routes reachable without an active session. Everything else is protected
 * by the redirect in `src/proxy.ts`.
 */
export const PUBLIC_ROUTES = ["/auth", "/register", "/forgot-password"];

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7,
} as const;
