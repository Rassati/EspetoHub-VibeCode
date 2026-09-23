import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function updateSession(request: NextRequest) {
    // The commercial home is public and does not need a Supabase session.
    if (request.nextUrl.pathname === "/")
        return NextResponse.next({ request });
    let response = NextResponse.next({ request });
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                response = NextResponse.next({ request });
                cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
            },
        },
    });
    const { data: { user }, } = await supabase.auth.getUser();
    const isPublicRoute = request.nextUrl.pathname === "/login" ||
        request.nextUrl.pathname === "/signup" ||
        request.nextUrl.pathname === "/auth/callback";
    const redirectWithCookies = (url: URL) => {
        const redirect = NextResponse.redirect(url);
        response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
        return redirect;
    };
    if (!user && !isPublicRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        url.search = "";
        url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
        return redirectWithCookies(url);
    }
    if (user && (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/signup")) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        url.search = "";
        return redirectWithCookies(url);
    }
    return response;
}
