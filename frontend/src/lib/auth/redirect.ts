// After login, the user goes back to the page they wanted to open
// (e.g. a share link), passed as /auth?next=/share/<token>.

// Only paths inside this app are allowed. "//evil.com" and "/\evil.com" are
// links to another site in a browser, so they are refused too.
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return "/";
  }
  return next;
}

// The login page url that brings the user back to `path` afterwards
export function loginUrlFor(path: string): string {
  return path === "/" ? "/auth" : `/auth?next=${encodeURIComponent(path)}`;
}
