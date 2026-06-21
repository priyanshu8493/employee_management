import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = request.nextUrl;

  const isLoginPage = pathname === "/login";
  const isEmployeeRoute = pathname.startsWith("/employee");
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isApiRoute = pathname.startsWith("/api");

  if (isApiRoute) {
    return NextResponse.next();
  }

  if (!token) {
    if (!isLoginPage) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  if (isLoginPage) {
    if (token.role === "OWNER") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/employee", request.url));
  }

  if (isDashboardRoute && token.role !== "OWNER") {
    return NextResponse.redirect(new URL("/employee", request.url));
  }

  if (isEmployeeRoute && token.role !== "EMPLOYEE") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/employee/:path*", "/dashboard/:path*"],
};
