import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PUBLIC_ROUTES, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  const isLoggedIn = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (!isLoggedIn && !isPublicRoute) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }
  // Check if the user is logged in and trying to access a public route (like /auth). If so, redirect them to the home page.
  if (isLoggedIn && isPublicRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
