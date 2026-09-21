import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";

const links = [
  { href: "/dashboard", label: "Início", icon: "⌂" },
  { href: "/orders/new", label: "Novo pedido", icon: "+" },
  { href: "/orders", label: "Pedidos", icon: "≡" },
  { href: "/products", label: "Produtos", icon: "◈" },
  { href: "/customers", label: "Clientes", icon: "☺" },
];

export function Navigation({ companyName, email }: { companyName: string; email: string }) {
  return (
    <>
      <aside className="sidebar">
        <Link href="/dashboard" className="logo"><span>EH</span> Espeto Hub</Link>
        <p className="company-name">{companyName}</p>
        <nav>{links.map((link) => <Link key={link.href} href={link.href}><i>{link.icon}</i>{link.label}</Link>)}</nav>
        <div className="account">
          <p>{email}</p>
          <form action={signOutAction}><button type="submit" className="text-button">Sair</button></form>
        </div>
      </aside>
      <nav className="mobile-nav">
        {links.map((link) => <Link key={link.href} href={link.href}><i>{link.icon}</i><span>{link.label}</span></Link>)}
      </nav>
    </>
  );
}
