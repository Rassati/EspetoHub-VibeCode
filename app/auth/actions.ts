"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

function value(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function signInAction(formData: FormData) {
  const email = value(formData, "email");
  const password = value(formData, "password");
  const next = value(formData, "next") || "/dashboard";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) redirect(`/login?error=${encodeURIComponent("E-mail ou senha inválidos.")}`);
  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signUpAction(formData: FormData) {
  const displayName = value(formData, "display_name");
  const companyName = value(formData, "company_name");
  const email = value(formData, "email");
  const password = value(formData, "password");

  if (!companyName || !email || password.length < 6) {
    redirect(`/signup?error=${encodeURIComponent("Preencha os dados e use uma senha com pelo menos 6 caracteres.")}`);
  }

  const supabase = await createClient();
  const requestHeaders = await headers();
  const siteUrl = requestHeaders.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName, company_name: companyName },
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  redirect("/login?check_email=1");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
