const LOGIN_ENDPOINT = "/api/login";

/**
 * Calls the dummy login route handler, which always succeeds and sets the
 * session cookie. Swap this for `apiFetch` once the real auth backend exists.
 */
export async function login(email: string, password: string): Promise<void> {
  const response = await fetch(LOGIN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`Login failed with status ${response.status}`);
  }
}
