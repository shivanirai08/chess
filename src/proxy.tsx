import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_ROUTES = ["/login", "/signup", "/newpwd", "/resetpwd", "/verifyotp"];
const PROTECTED_ROUTES = ["/dashboard", "/play"];
const GUEST_ALLOWED_ROUTES = ["/onboarding", "/chess"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Get token (from cookies)
  const token = req.cookies.get("auth-token")?.value;

  // Case 1: Root path "/" - redirect authenticated users to dashboard
  if (pathname === "/" && token) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Case 2: Authenticated user trying to access auth pages (login, signup, etc.)
  if (token && AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Case 3: Allow guest routes (onboarding, chess games) without authentication
  if (GUEST_ALLOWED_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Case 4: Unauthenticated user trying to access protected pages
  if (!token && PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Case 5: /newpwd, /verifyotp accessible only if routed
  if (["/newpwd", "/verifyotp"].some((r) => pathname.startsWith(r))) {
    const routed = req.nextUrl.searchParams.get("routed");
    if (!routed && !token) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  // Allow all other routes
  return NextResponse.next();
}

// Define which routes should trigger this middleware
export const config = {
  matcher: [
    "/",
    "/login",
    "/signup",
    "/newpwd",
    "/resetpwd",
    "/verifyotp",
    "/dashboard",
    "/play",
    "/onboarding",
    "/chess/:path*", // handle dynamic chess routes too
  ],
};
