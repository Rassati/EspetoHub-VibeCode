import type { Metadata } from "next";
import Link from "next/link";
import { SalesDemo } from "@/components/sales-demo";
import styles from "./sales.module.css";
export const metadata: Metadata = {
    title: "Espeto Hub | Seu negócio organizado, do pedido à entrega",
    description: "Organize pedidos, clientes e produtos em um só lugar. Conheça o Espeto Hub, o sistema feito para facilitar a rotina de quem vende espetos e produtos em pacotes.",
};
const benefits = [
    { icon: "▤", title: "Cada pedido no seu lugar", text: "Acompanhe o que chegou, o que está em preparo e o que já foi entregue. Mais clareza para organizar o próximo atendimento." },
    { icon: "◎", title: "O cliente voltou? Está tudo aqui.", text: "Encontre nome, telefone, endereço e histórico de pedidos sem procurar em anotações espalhadas." },
    { icon: "▦", title: "Um catálogo do seu jeito", text: "Cadastre fotos, preços e diferentes pacotes do mesmo produto. Escolha a variação e a quantidade na hora de vender." },
    { icon: "↗", title: "Entenda o movimento do dia", text: "Consulte pedidos recebidos e valores das entregas por data. Veja quais produtos têm mais saída para planejar a rotina." },
];
const questions = [
    ["Para quem é o Espeto Hub?", "Para pequenos negócios que vendem espetos e outros produtos em pacotes. Você pode cadastrar diferentes tamanhos e preços, organizar clientes e acompanhar cada pedido até a entrega."],
    ["Preciso instalar alguma coisa?", "Você pode acessar pelo navegador do celular ou computador, com conexão à internet. Em navegadores compatíveis, também é possível adicionar o site à tela inicial."],
    ["Como começo a usar?", "Crie sua conta e sua empresa, confirme seu e-mail se solicitado e cadastre seus produtos e clientes. Depois, escolha um cliente, adicione os itens e salve o primeiro pedido."],
    ["Outras empresas conseguem ver meus pedidos?", "Os dados de pedidos, clientes e produtos são separados por empresa, com acesso vinculado à conta. As fotos do catálogo são públicas para facilitar a exibição dos produtos."],
    ["O sistema recebe pagamentos ou pedidos do WhatsApp?", "Ainda não. O Espeto Hub organiza os pedidos que você registra e acompanha suas entregas. Pagamentos, integração com WhatsApp e baixa automática de estoque não fazem parte desta versão."],
];
export default function Home() {
    return (<div className={styles.site}>
      <a className={styles.skip} href="#conteudo">Pular para o conteúdo</a>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Espeto Hub, início"><span className={styles.brandIcon}>eh</span>espeto<span>hub</span></Link>
        <nav className={styles.nav} aria-label="Navegação principal"><a href="#recursos">Recursos</a><a href="#demonstracao">Veja na prática</a><a href="#duvidas">Dúvidas</a></nav>
        <div className={styles.headerActions}><Link href="/login" className={styles.login}>Entrar</Link><Link href="/signup" className={styles.primary}>Criar minha conta</Link></div>
      </header>
      <main id="conteudo">
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.tag}><span /> Feito para o seu pequeno negócio</span>
            <h1>Pedido organizado.<br />Negócio no ponto.</h1>
            <p>Do primeiro atendimento à última entrega: produtos, clientes e pedidos juntos em um painel simples de usar.</p>
            <div className={styles.heroActions}><Link href="/signup" className={styles.primary}>Organizar meu negócio</Link><a href="#demonstracao" className={styles.secondary}><span aria-hidden="true">▷</span> Conhecer o painel</a></div>
            <div className={styles.heroNotes}><span>✓ No celular e no computador</span><span>✓ Sem planilhas complicadas</span></div>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.ticket}>
              <div className={styles.ticketTop}><span className={styles.brandIcon}>eh</span><span>Sua rotina, mais leve<small>Do pedido à entrega</small></span><span className={styles.ticketDot}/></div>
              <div className={styles.ticketHeading}><span>Pedido #042</span><b>Pronto para entregar</b></div>
              <h2>Um bom pedido começa<br />com tudo no lugar.</h2>
              <div className={styles.ticketRow}><span>Espeto de carne<small>2 pacotes com 10 unidades</small></span><strong>R$ 90,00</strong></div>
              <div className={styles.ticketRow}><span>Espeto de frango<small>1 pacote com 10 unidades</small></span><strong>R$ 35,00</strong></div>
              <div className={styles.ticketTotal}><span>Total calculado</span><strong>R$ 125,00</strong></div>
              <div className={styles.ticketSteps}><span>✓ Recebido</span><i /><span>✓ Preparado</span><i /><span>Entrega</span></div>
              <small className={styles.example}>Exemplo ilustrativo de pedido</small>
            </div>
            <div className={styles.floatingNote}><span>✓</span><div>Menos contas de cabeça.<small>Mais atenção ao seu cliente.</small></div></div>
          </div>
        </section>
        <div className={styles.promiseBar}><span>Uma rotina com mais controle</span><b>Pedidos organizados</b><b>Clientes por perto</b><b>Preços sempre à mão</b><b>Entregas acompanhadas</b></div>
        <section className={styles.demoSection} id="demonstracao">
          <div className={styles.sectionHeading}><div><span className={styles.sectionLabel}>Conheça seu próximo painel</span><h2>Seu negócio, à primeira vista.</h2></div><p>Experimente a visão de vendas e a lista de pedidos.<br />Tudo aqui usa dados fictícios de demonstração.</p></div>
          <SalesDemo />
          <p className={styles.demoFootnote}>Demonstração interativa. Na sua conta, o painel mostra os dados reais da sua empresa.</p>
        </section>
        <section className={styles.benefitSection} id="recursos">
          <div className={styles.benefitIntro}><span className={styles.sectionLabel}>Da correria para a organização</span><h2>Cuide dos seus clientes.<br />Deixe os pedidos<br />em ordem.</h2><p>Ferramentas para as tarefas que se repetem todos os dias. Fáceis de encontrar, simples de usar.</p><Link href="/signup" className={styles.textLink}>Começar com minha empresa <span aria-hidden="true">↗</span></Link></div>
          <div className={styles.benefitGrid}>{benefits.map((benefit) => <article key={benefit.title}><span className={styles.featureIcon} aria-hidden="true">{benefit.icon}</span><h3>{benefit.title}</h3><p>{benefit.text}</p></article>)}</div>
        </section>
        <section className={styles.stepsSection}><div><span className={styles.sectionLabel}>Do cadastro ao primeiro pedido</span><h2>Começar pode ser simples.</h2></div><ol className={styles.steps}><li><span>1</span><h3>Crie sua empresa</h3><p>Cadastre sua conta para ter um espaço dedicado ao seu negócio.</p></li><li><span>2</span><h3>Monte seu catálogo</h3><p>Adicione produtos, pacotes e preços. Cadastre seus clientes.</p></li><li><span>3</span><h3>Registre e acompanhe</h3><p>Salve o pedido, acompanhe o preparo e imprima a comanda.</p></li></ol></section>
        <section className={styles.faqSection} id="duvidas"><div><span className={styles.sectionLabel}>Antes de começar</span><h2>Ainda tem alguma dúvida?</h2><p>Veja como o Espeto Hub se encaixa na sua rotina.</p></div><div className={styles.faqList}>{questions.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
        <section className={styles.finalCta}><div><h2>Seu próximo pedido<br />já pode ser mais organizado.</h2><p>Junte o que importa e dê mais espaço para o seu negócio acontecer.</p></div><Link href="/signup" className={styles.primary}>Criar minha conta</Link></section>
      </main>
      <footer className={styles.footer}><Link href="/" className={styles.brand}><span className={styles.brandIcon}>eh</span>espeto<span>hub</span></Link><p>Pedidos organizados. Dia mais leve.</p><Link href="/login">Já tenho uma conta</Link></footer>
    </div>);
}
