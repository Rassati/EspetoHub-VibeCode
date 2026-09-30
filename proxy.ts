import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
// Next.js 16 calls this request boundary a Proxy. It keeps Supabase sessions
// fresh and sends unauthenticated visitors to the login screen.
export async function proxy(request: NextRequest) {
    return updateSession(request);
}
export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest).*)"],
};
