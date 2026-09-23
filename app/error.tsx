"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: {
    error: Error & {
        digest?: string;
    };
    reset: () => void;
}) {
    return <section className="page narrow-page" role="alert"><div className="panel"><h1>Não foi possível carregar esta página.</h1><p className="muted">Verifique sua conexão e tente novamente. Se a sessão terminou, entre na sua conta.</p><div className="recovery-actions"><button type="button" className="button button-primary" onClick={reset}>Tentar novamente</button><Link href="/login" className="button button-secondary">Entrar na conta</Link></div></div></section>;
}
