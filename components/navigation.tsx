"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/auth/actions";
import { SubmitButton } from "@/components/submit-button";
const links = [
    { href: "/dashboard", label: "Início", icon: "⌂" },
    { href: "/orders/new", label: "Novo pedido", icon: "+" },
    { href: "/orders", label: "Pedidos", icon: "≡" },
    { href: "/products", label: "Produtos", icon: "◈" },
    { href: "/customers", label: "Clientes", icon: "☺" },
];
export function Navigation({ companyName, email }: {
    companyName: string;
    email: string;
}) {
    const pathname = usePathname();
    const current = (href: string) => href === "/orders"
        ? pathname.startsWith("/orders") && pathname !== "/orders/new"
        : pathname === href || pathname.startsWith(`${href}/`);
    return (<>
      <aside className="sidebar">
        <Link href="/dashboard" className="logo"><span>EH</span> Espeto Hub</Link>
        <p className="company-name">{companyName}</p>
        <nav aria-label="Menu principal">{links.map((link) => <Link key={link.href} href={link.href} aria-current={current(link.href) ? "page" : undefined}><i aria-hidden="true">{link.icon}</i>{link.label}</Link>)}</nav>
        <div className="account">
          <p>{email}</p>
          <form action={signOutAction}><SubmitButton className="text-button" pendingText="Saindo…">Sair</SubmitButton></form>
        </div>
      </aside>
      <header className="mobile-account"><Link href="/dashboard" className="logo"><span>EH</span><b>{companyName}</b></Link><form action={signOutAction}><SubmitButton className="text-button" pendingText="Saindo…">Sair</SubmitButton></form></header>
      <nav className="mobile-nav" aria-label="Menu principal no celular">
        {links.map((link) => <Link key={link.href} href={link.href} aria-current={current(link.href) ? "page" : undefined}><i aria-hidden="true">{link.icon}</i><span>{link.label}</span></Link>)}
      </nav>
    </>);
}
