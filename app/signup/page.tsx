import Link from "next/link";
import { signUpAction } from "@/app/auth/actions";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function SignUpPage({ searchParams }: Props) {
  const params = await searchParams;
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-mark">EH</div>
        <p className="eyebrow">Começo rápido</p>
        <h1>Crie sua empresa</h1>
        <p className="muted">Você será o administrador da conta e pode começar a cadastrar produtos em minutos.</p>
        {params.error && <p className="form-error">{params.error}</p>}
        <form action={signUpAction} className="stack-form">
          <label>Seu nome<input name="display_name" autoComplete="name" placeholder="Ex.: Maria" /></label>
          <label>Nome da empresa<input required name="company_name" placeholder="Ex.: Espetos da Maria" /></label>
          <label>E-mail<input required name="email" type="email" autoComplete="email" placeholder="voce@empresa.com" /></label>
          <label>Crie uma senha<input required minLength={6} name="password" type="password" autoComplete="new-password" placeholder="Pelo menos 6 caracteres" /></label>
          <button className="button button-primary" type="submit">Criar conta</button>
        </form>
        <p className="auth-switch">Já tem conta? <Link href="/login">Entrar</Link></p>
      </section>
    </main>
  );
}
