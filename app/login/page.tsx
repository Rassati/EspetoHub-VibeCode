import { SubmitButton } from "@/components/submit-button";
import Link from "next/link";
import { signInAction } from "@/app/auth/actions";
type Props = {
    searchParams: Promise<{
        error?: string;
        check_email?: string;
        next?: string;
    }>;
};
export default async function LoginPage({ searchParams }: Props) {
    const params = await searchParams;
    return (<main className="auth-page">
      <section className="auth-card">
        <div className="brand-mark">EH</div>
        <p className="eyebrow">Espeto Hub</p>
        <h1>Pedidos organizados. Dia mais leve.</h1>
        <p className="muted">Entre para registrar pedidos sem papel e sem contas de cabeça.</p>
        {params.error && <p className="form-error">{params.error}</p>}
        {params.check_email && <p className="form-success">Conta criada. Confira seu e-mail para confirmar o acesso.</p>}
        <form action={signInAction} className="stack-form">
          <input type="hidden" name="next" value={params.next ?? "/dashboard"}/>
          <label>E-mail<input required name="email" type="email" autoComplete="email" placeholder="voce@empresa.com"/></label>
          <label>Senha<input required name="password" type="password" autoComplete="current-password" placeholder="Sua senha"/></label>
          <SubmitButton pendingText="Entrando…">Entrar</SubmitButton>
        </form>
        <p className="auth-switch">Ainda não tem conta? <Link href="/signup">Criar minha empresa</Link></p>
      </section>
    </main>);
}
