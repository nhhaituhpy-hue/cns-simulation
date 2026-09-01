import { NextResponse, type NextRequest } from "next/server";

function sessionCookieName() {
  return process.env.SESSION_COOKIE_NAME?.trim() || "cns_session";
}

export function proxy(request: NextRequest) {
  if (process.env.MEDIA_CAPTURE_MODE === "1") {
    return NextResponse.next({ request });
  }

  const pathname = request.nextUrl.pathname;
  const hasSessionCookie = Boolean(request.cookies.get(sessionCookieName())?.value);
  const isLoginPage = pathname === "/login";
  const isPasswordChangePage = pathname === "/change-password";
  const isProtectedPage = !isLoginPage && !isPasswordChangePage;

  if (isProtectedPage && !hasSessionCookie) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginPage && request.method === "GET" && hasSessionCookie) {
    const changePasswordUrl = request.nextUrl.clone();
    changePasswordUrl.pathname = "/change-password";
    changePasswordUrl.search = "";
    return NextResponse.redirect(changePasswordUrl);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!api(?:/|$)|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|mp3)$).*)",
  ],
};
