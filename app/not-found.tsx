import Link from "next/link";
export default function NotFound() {
    return <main className="page narrow-page"><div className="panel"><h1>Página não encontrada.</h1><p className="muted">Este registro não existe ou não está disponível para sua empresa.</p><div className="recovery-actions"><Link href="/dashboard" className="button button-primary">Voltar ao painel</Link></div></div></main>;
}
