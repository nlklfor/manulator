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

export function getTokenClaims(): { id: string; email: string } | null {
  const token = getAuthToken();
  const payloadPart = token?.split(".")[1];
  if (!payloadPart) {
    return null;
  }

  try {
    const json = atob(payloadPart.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { sub?: string; email?: string };
    return payload.sub ? { id: payload.sub, email: payload.email ?? "" } : null;
  } catch {
    return null;
  }
}

// Remembers for one page load that the user has just logged in,
// so the dashboard can greet them once.
const JUST_LOGGED_IN_KEY = "mt-just-logged-in";

export function markJustLoggedIn() {
  try {
    sessionStorage.setItem(JUST_LOGGED_IN_KEY, "1");
  } catch {
    // storage can be blocked (private mode); the greeting is then skipped
  }
}

// Returns true once after a login, then forgets it again
export function consumeJustLoggedIn(): boolean {
  try {
    const justLoggedIn = sessionStorage.getItem(JUST_LOGGED_IN_KEY) === "1";
    sessionStorage.removeItem(JUST_LOGGED_IN_KEY);
    return justLoggedIn;
  } catch {
    return false;
  }
}

// Carries the logout message to the sign-in page. A short-lived cookie is
// used (not sessionStorage) so the server-rendered page can read it.
export const LOGOUT_MESSAGE_COOKIE_NAME = "logout-message";

export function storeLogoutMessage(message: string) {
  const { path, sameSite } = SESSION_COOKIE_OPTIONS;
  document.cookie = `${LOGOUT_MESSAGE_COOKIE_NAME}=${encodeURIComponent(message)}; Path=${path}; Max-Age=60; SameSite=${sameSite}`;
}

// Removes the message again once the sign-in page has shown it
export function clearLogoutMessage() {
  const { path, sameSite } = SESSION_COOKIE_OPTIONS;
  document.cookie = `${LOGOUT_MESSAGE_COOKIE_NAME}=; Path=${path}; Max-Age=0; SameSite=${sameSite}`;
}
