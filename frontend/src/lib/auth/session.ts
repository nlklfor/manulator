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

/**
 * Client-side session token storage, backed by a cookie so that `src/proxy.ts`
 * can read it on the server and guard protected routes.
 *
 * Note: a cookie written from the browser cannot be `httpOnly`. To get that
 * protection the cookie has to be set by a server route handler instead.
 */
export function getAuthToken(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${SESSION_COOKIE_NAME}=`));

  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}

export function setAuthToken(token: string) {
  const { path, maxAge, sameSite, secure } = SESSION_COOKIE_OPTIONS;

  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    `Path=${path}`,
    `Max-Age=${maxAge}`,
    `SameSite=${sameSite}`,
  ];

  if (secure) {
    parts.push("Secure");
  }

  document.cookie = parts.join("; ");
}

export function clearAuthToken() {
  const { path, sameSite } = SESSION_COOKIE_OPTIONS;
  document.cookie = `${SESSION_COOKIE_NAME}=; Path=${path}; Max-Age=0; SameSite=${sameSite}`;
}
