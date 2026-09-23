"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { formText, safeRedirect } from "@/lib/validation";
function value(formData: FormData, name: string) {
    return formText(formData, name);
}
export async function signInAction(formData: FormData) {
    const email = value(formData, "email");
    const password = formText(formData, "password", false);
    const next = safeRedirect(value(formData, "next"));
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error)
        redirect(`/login?${new URLSearchParams({ error: "Não foi possível entrar. Confira e-mail, senha e a confirmação do seu cadastro.", next })}`);
    redirect(next);
}
export async function signUpAction(formData: FormData) {
    const displayName = value(formData, "display_name");
    const companyName = value(formData, "company_name");
    const email = value(formData, "email");
    const password = formText(formData, "password", false);
    if (companyName.length < 2 || companyName.length > 120 || displayName.length > 140 || !email || password.length < 6) {
        redirect(`/signup?error=${encodeURIComponent("Preencha os dados e use uma senha com pelo menos 6 caracteres.")}`);
    }
    const supabase = await createClient();
    const requestHeaders = await headers();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || requestHeaders.get("origin") || "http://localhost:3000";
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { display_name: displayName, company_name: companyName },
            emailRedirectTo: new URL("/auth/callback", siteUrl).toString(),
        },
    });
    if (error)
        redirect(`/signup?error=${encodeURIComponent("Não foi possível criar a conta. Confira os dados e tente novamente.")}`);
    if (data.session)
        redirect("/dashboard");
    redirect("/login?check_email=1");
}
export async function signOutAction() {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error)
        throw new Error("Não foi possível sair. Tente novamente.");
    redirect("/login");
}
