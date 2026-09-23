import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
export type CompanyContext = {
    userId: string;
    email: string;
    company: {
        id: string;
        name: string;
        slug: string;
    };
    role: string;
};
// Deduplicate only within this server render, never between users/requests.
export const getCompanyContext = cache(async (): Promise<CompanyContext> => {
    const supabase = await createClient();
    const { data: { user }, } = await supabase.auth.getUser();
    if (!user)
        redirect("/login");
    const { data, error } = await supabase
        .from("company_members")
        .select("company_id, role, companies(id, name, slug)")
        .eq("user_id", user.id)
        .order("created_at")
        .order("company_id")
        .limit(1)
        .single();
    if (error || !data || !data.companies) {
        throw new Error("Não foi possível encontrar uma empresa para este usuário.");
    }
    const company = data.companies as unknown as {
        id: string;
        name: string;
        slug: string;
    };
    return {
        userId: user.id,
        email: user.email ?? "",
        company,
        role: data.role as string,
    };
});
