import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PUBLIC_ROUTES, SESSION_COOKIE_NAME } from "@/lib/auth/session";

/**
 * Decode the JWT issued by the backend (see `backend/app/routers/auth.py`)
 * and return whether it is structurally valid and not expired.
 *
 * This only inspects the payload (no signature verification) since the
 * proxy runs on the edge runtime and the token is just used to gate
 * client-side navigation; the backend still verifies the signature on
 * every API request.
 */
function isValidSession(token: string | undefined): boolean {
  if (!token) {
    return false;
  }

  // Each Jwt Token has three parts separated by dots: header, payload, and signature
  const parts = token.split(".");

  // if the token has not three parts, it is invalid
  if (parts.length !== 3) {
    return false;
  }

  try {
    // take the payload part of the token, decode it from base64, and parse it as JSON
    const payloadPart = parts[1];
    // decode the payload from base64 to a JSON string
    const payloadJson = Buffer.from(payloadPart, "base64").toString("utf-8");
    // Create a JSON object from the JSON string
    const payload = JSON.parse(payloadJson) as { exp?: number };

    // if no exp field is present, the token is invalid
    if (!payload.exp) {
      return false;
    }
    // check if the token is expired (exp is in seconds, Date.now() is in milliseconds)
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export default async function proxy(req: NextRequest) {
  // 1. Check if the current route is protected or public
  const path = req.nextUrl.pathname;
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => path === route || path.startsWith(`${route}/`),
  );

  // 2. Validate the JWT stored in the session cookie
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = isValidSession(token);

  // 3. Redirect to /auth if the user is not authenticated on a protected route
  if (!isPublicRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/auth", req.nextUrl));
  }

  // 4. Redirect to / if the user is already authenticated on a public route
  if (isPublicRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
}

// Routes Proxy should not run on
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.png$).*)"],
};
