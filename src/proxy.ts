import { NextResponse, type NextRequest } from "next/server";
import { localeRedirectPath } from "@/lib/i18n/redirect";
import { LANG_COOKIE } from "@/lib/theme";

/** Sends locale-less URLs to /uz or /ru (cookie → Accept-Language → uz). */
export function proxy(request: NextRequest): NextResponse | undefined {
  const { pathname, search } = request.nextUrl;
  const target = localeRedirectPath(
    pathname,
    search,
    request.cookies.get(LANG_COOKIE)?.value,
    request.headers.get("accept-language"),
  );
  return target
    ? NextResponse.redirect(new URL(target, request.url))
    : undefined;
}

export const config = {
  // everything except Next internals and files with an extension (icons, images, favicon)
  matcher: ["/((?!_next|favicon.ico|.*\\..*).*)"],
};
