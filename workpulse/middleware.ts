import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });

  const { pathname } = request.nextUrl;
  const isLoginPage = pathname === "/login";
  const isEmployeeRoute = pathname.startsWith("/employee");
  const isDashboardRoute = pathname.startsWith("/dashboard");

  // Unauthenticated → redirect to login with callbackUrl
  if (!token) {
    if (!isLoginPage) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Authenticated on login page → redirect based on role
  if (isLoginPage) {
    if (token.role === "OWNER") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/employee", request.url));
  }

  // RBAC: OWNER → /dashboard only; TEAM_LEADER/EMPLOYEE → /employee only
  if (isDashboardRoute && token.role !== "OWNER") {
    return NextResponse.redirect(new URL("/employee", request.url));
  }

  if (isEmployeeRoute && token.role !== "EMPLOYEE" && token.role !== "TEAM_LEADER") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/employee/:path*", "/dashboard/:path*"],
};
