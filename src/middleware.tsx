import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_ROUTES = ["/login", "/signup", "/newpwd", "/resetpwd", "/verifyotp"];
const PROTECTED_ROUTES = ["/dashboard", "/play"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Get token (from cookies)
  const token = req.cookies.get("token")?.value;

  // Case 1: Authenticated user trying to access auth pages
  if (token && AUTH_ROUTES.some((route) => pathname.startsWith(route))) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Case 2: Unauthenticated user trying to access protected pages
  if (!token && PROTECTED_ROUTES.some((route) => pathname.startsWith(route))) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Case 3: /newpwd, /verifyotp accessible only if routed (optional)
  // Example: if you pass a temp flag in query like ?routed=true
  if (
    ["/newpwd", "/verifyotp"].some((r) => pathname.startsWith(r))
  ) {
    const routed = req.nextUrl.searchParams.get("routed");
    if (!routed && !token) {
      const url = req.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  // Allow all other routes (including /chess/[gameId])
  return NextResponse.next();
}

// Define which routes should trigger this middleware
export const config = {
  matcher: [
    "/login",
    "/signup",
    "/newpwd",
    "/resetpwd",
    "/verifyotp",
    "/dashboard",
    "/play",
    "/chess/:path*", // handle dynamic chess routes too
  ],
};
