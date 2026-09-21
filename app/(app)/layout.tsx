import { Navigation } from "@/components/navigation";
import { getCompanyContext } from "@/lib/auth";

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const context = await getCompanyContext();
  return (
    <div className="app-shell">
      <Navigation companyName={context.company.name} email={context.email} />
      <main className="app-main">{children}</main>
    </div>
  );
}
