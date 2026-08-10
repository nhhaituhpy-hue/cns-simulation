import { NextResponse, type NextRequest } from "next/server";
import { refreshAuthSession } from "@/lib/supabase/proxy";

function responseWithRefreshedCookies(target: URL, source: NextResponse) {
  const redirect = NextResponse.redirect(target);
  source.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export async function proxy(request: NextRequest) {
  if (process.env.MEDIA_CAPTURE_MODE === "1") {
    return NextResponse.next({ request });
  }

  const { response, claims } = await refreshAuthSession(request);
  const pathname = request.nextUrl.pathname;
  const isPublicPage = pathname === "/login";
  const isApiRequest = pathname.startsWith("/api/") || pathname === "/api";
  const isProtectedPage = !isPublicPage && !isApiRequest;

  if (isProtectedPage && !claims?.sub) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return responseWithRefreshedCookies(loginUrl, response);
  }

  // Server Actions defined in the login page are invoked as POST /login.
  // A recovery OTP creates a temporary authenticated session before the
  // new-password action runs, so redirecting every /login request here would
  // intercept that action and return 307 instead of letting it update Auth.
  if (pathname === "/login" && request.method === "GET" && claims?.sub) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return responseWithRefreshedCookies(homeUrl, response);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|mp3)$).*)",
  ],
};
