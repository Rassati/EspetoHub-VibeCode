import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get("code");
    const destination = request.nextUrl.clone();
    destination.pathname = "/dashboard";
    destination.search = "";
    const failure = request.nextUrl.clone();
    failure.pathname = "/login";
    failure.search = "";
    failure.searchParams.set("error", "O link de confirmação é inválido ou expirou. Tente entrar com seu e-mail e senha.");
    if (!code)
        return NextResponse.redirect(failure);
    const response = NextResponse.redirect(destination);
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        cookies: {
            getAll: () => request.cookies.getAll(),
            setAll: (cookies) => cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
        },
    });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
        const redirect = NextResponse.redirect(failure);
        response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
        return redirect;
    }
    return response;
}
