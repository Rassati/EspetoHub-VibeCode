# Espeto Hub

Um MVP mobile-first para pequenas empresas que vendem produtos em pacotes. Ele permite cadastrar produtos e suas formas de venda, clientes e pedidos, com totais calculados no banco e histórico de vendas.

## Visão do produto

O Espeto Hub substitui o papel no atendimento diário: a pessoa escolhe um cliente, toca nas variações de produto, confere o total e salva. Cada pedido preserva o nome e o preço praticado no momento da venda, então uma alteração futura no catálogo não muda o histórico.

## Decisões tomadas para o MVP

- **Stack:** Next.js, TypeScript, Supabase Auth/PostgreSQL e Vercel. Não há microsserviços nem dependências de interface desnecessárias.
- **Produto e forma de venda são separados:** `Espeto de carne` pode ter `Pacote com 5` e `Pacote com 10`, cada qual com preço e quantidade física próprios.
- **Dinheiro em centavos:** preços são inteiros (`price_cents`), evitando erros de arredondamento comuns com decimais.
- **Uma empresa por cadastro inicial:** ao criar uma conta, um gatilho seguro cria a empresa e seu usuário proprietário. A estrutura já aceita mais integrantes e empresas.
- **Pedidos por função do banco:** o navegador envia apenas cliente, variações e quantidades. A função `create_order` consulta o preço vigente, calcula os totais e grava o pedido em uma transação.
- **Data de venda transparente:** `created_at` registra quando o pedido foi recebido; `delivered_at` registra quando ele foi entregue. O painel financeiro usa a entrega, e o painel comercial mostra os pedidos recebidos no dia escolhido.
- **Estoque preparado, não ativado:** as tabelas de saldo e movimentações já existem, mas nenhum estoque é descontado no checkout ainda. Isso evita introduzir regras de lote/validade antes de serem necessárias.

## Arquitetura

A rota `/` é a página comercial pública: apresenta os benefícios do Espeto Hub,
uma demonstração interativa com dados fictícios, perguntas frequentes e links
para `/signup` e `/login`. Ela não consulta o Supabase. O painel operacional
continua em `/dashboard`, com autenticação e isolamento por empresa.

A apresentação fica em `app/page.tsx`, com estilos isolados em
`app/sales.module.css` e a demonstração em `components/sales-demo.tsx`.
Não requer bibliotecas adicionais nem serviços de imagens.

```text
Celular ou navegador
        |
        v
Next.js (App Router, telas e Server Actions) -----> Vercel
        |
        | cliente Supabase com sessão do usuário
        v
Supabase
  ├─ Auth: login, confirmação de e-mail e sessão
  ├─ PostgreSQL: dados da aplicação
  │    ├─ RLS: isolamento obrigatório por empresa
  │    └─ RPCs: criação de pedido e mudança de status
  ├─ Storage: fotos públicas dos produtos; escrita restrita à empresa
  └─ Futuro: Edge Functions / integração WhatsApp
```

O frontend nunca decide o preço que será persistido e não é a única barreira entre empresas: cada tabela de negócio tem `company_id`, políticas RLS e chaves estrangeiras compostas que mantêm o registro no mesmo tenant.

## Modelo de dados

```text
auth.users ── 1:1 ── profiles
     │
     └── company_members ── N:1 ── companies
                                      │
                                      ├── products ── 1:N ── product_variants
                                      │                         │
                                      │                         └── inventory_items ── 1:N ── inventory_movements
                                      ├── customers ── 1:N ── orders ── 1:N ── order_items
                                      └── company_members
```

| Tabela | Papel |
|---|---|
| `companies` | Tenant: uma empresa cliente do SaaS. |
| `profiles` | Perfil público mínimo de um usuário autenticado. |
| `company_members` | Vínculo usuário–empresa e papel futuro (`owner`, `manager`, `seller`, `stock`). |
| `products` | Produto base, como “Espeto de carne”. |
| `product_variants` | Forma vendida, preço em centavos, quantidade por pacote e estado ativo. |
| `customers` | Nome, telefone, endereço e observações. |
| `orders` | Cabeçalho, número sequencial por empresa, totais, status e cliente. |
| `order_items` | Snapshot do nome, variação, preço e unidades no momento da venda. |
| `inventory_items` / `inventory_movements` | Base para estoque posterior, sem interferir no MVP. |

O arquivo `supabase/migrations/0001_initial_schema.sql` contém PKs, FKs, constraints, índices, gatilhos, RLS e as funções RPC.

## O que ainda é uma decisão de produto

Nada disso bloqueia o protótipo:

- Política de entrega e pagamento (dinheiro, Pix, fiado, taxa de entrega).
- Se o estoque será contado em pacotes, unidades ou ambos para cada produto.
- Papéis e permissões detalhados para funcionários convidados.
- Planos, cobrança e onboarding para outras empresas.
- Integração oficial com WhatsApp e o fluxo de revisão de pedidos recebidos.

## Como executar localmente

1. Crie um projeto em [Supabase](https://supabase.com/dashboard/projects) e, no **SQL Editor**, execute as migrações `0001`, `0003`, `0004` e `0005`, nessa ordem. A `0002` é apenas uma recuperação para instalações antigas em que a primeira migração falhou; não execute `0002` em uma instalação nova.
2. Em **Authentication → URL Configuration**, adicione `http://localhost:3000/auth/callback` como Redirect URL. Para o primeiro teste mais simples, em **Authentication → Providers → Email**, você pode desativar a confirmação de e-mail temporariamente. Com ela ativa, confirme o e-mail recebido antes de entrar.
3. Copie `.env.example` para `.env.local` e preencha a URL, a chave publishable/anon e a URL local da aplicação. Em produção, altere `NEXT_PUBLIC_SITE_URL` para a URL final do Vercel. Nunca use a `service_role` no navegador ou em `NEXT_PUBLIC_*`.
4. Instale as dependências e inicie a aplicação:

   ```bash
   npm install
   npm run dev
   ```

5. Abra `http://localhost:3000`, crie a primeira conta/empresa, cadastre produtos e clientes e faça um pedido.

### Migrações posteriores

Se a primeira execução do banco parou no erro de `inventory_items`, execute os arquivos no SQL Editor do Supabase nesta ordem:

1. `0002_resume_after_inventory_fk_error.sql` — conclui a estrutura que ficou incompleta.
2. `0003_delivery_date_and_dashboard.sql` — registra a data de entrega e permite o painel financeiro por dia.
3. `0004_customer_management_and_product_images.sql` — habilita edição/exclusão de clientes e fotos dos produtos. Este último pode ser executado novamente sem problema.
4. `0005_order_validation_and_storage.sql` — corrige pedidos com desconto, valida os itens na RPC, permite criar produto e primeira variação em uma transação, restringe uploads no servidor e corrige a permissão necessária para remover fotos. Pode ser reaplicada sem apagar registros.

Em uma instalação que já executou `0003` e `0004`, execute apenas `0005`.
Até essa migração, o cadastro de produtos usa o caminho anterior de compatibilidade;
a correção de descontos no banco e a criação atômica só ficam ativas após aplicá-la.

### Verificação local

Use Node.js 22 ou superior e execute `npm run check` e `npm run build`.
`npm test` usa um PostgreSQL em memória (PGlite, dependência de desenvolvimento)
para validar as migrações, sem ler `.env.local` nem conectar ao banco real.
Os testes também cobrem preços, datas inválidas, redirecionamentos, cookies,
paginação e o HTML da comanda sem endereço. O antigo `next lint` foi removido
porque não é um comando disponível no Next.js 16; `typecheck` verifica os tipos.

O histórico agora possui páginas de 50 pedidos. Listas e totais consultam os
registros em lotes para não parar silenciosamente no limite padrão da API.
A autenticação é deduplicada apenas durante a renderização da mesma requisição,
sem compartilhar sessões ou dados entre visitantes.

## Atendimento mais rápido

- **Cadastro em sequência:** em Produtos, preencha nome e preço. Marque “Este produto tem variações” quando houver tipos, sabores, tamanhos ou pacotes. Após salvar, escolha “Cadastrar outro produto” ou “Adicionar outra variação”, sem sair da tela. Erros mantêm os campos preenchidos.
- **Grupos como Linguiças:** cadastre Linguiças uma vez e adicione Toscana, Apimentada, Com queijo etc. como variações. Na comanda e no resumo, produto e variação aparecem juntos em destaque, por exemplo **2 × Linguiças — Toscana**. Os cadastros existentes continuam funcionando; não é preciso recriá-los.
- **Catálogo grande:** a lista de produtos tem busca sem distinção de acentos por produto/variação, filtro de ativos/inativos e páginas de 12 produtos. Ao buscar uma variação, ela aparece primeiro no cartão encontrado.
- A tela **Novo pedido** tem busca por nome de produto ou variação, filtro “No pedido” e cartões compactos; ela continua prática mesmo com 40 ou mais produtos.
- Cada produto pode ter uma **foto de capa** em JPG, PNG ou WebP de até 5 MB. A foto pode ser trocada ou removida pela empresa no Supabase Storage. O bucket é público: qualquer pessoa com a URL pode visualizar a imagem; não envie documentos ou fotos confidenciais.
- Em **Clientes**, toque em um cartão para editar os dados. A exclusão pede confirmação e só é permitida quando o cliente ainda não tem pedidos, protegendo o histórico de vendas.
- Em um pedido salvo, use **Imprimir comanda**. A aplicação abre uma página limpa, chama a impressão do navegador e inclui nome e telefone do cliente, itens, observações, total e status. O endereço cadastrado não é consultado nem exibido na comanda. Endereços digitados manualmente nas observações continuam sendo texto livre do pedido. Funciona também no celular, usando a opção de imprimir/compartilhar do aparelho.
- Todas as datas e horas são apresentadas no fuso de Brasília (`America/Sao_Paulo`).

### Comanda em uma folha

A impressão usa A4 em retrato, margens de 10 mm e ajuste automático de escala
para acomodar a comanda inteira em uma única folha, sem remover itens.
O ajuste ocorre após carregar os estilos/fontes e novamente antes de imprimir
(inclusive pelo Ctrl+P). Pedidos muito grandes ficam com letras menores.
No diálogo da impressora, mantenha A4, escala 100% e cabeçalhos/rodapés do navegador
desativados. Alterações manuais de papel, escala ou margens podem mudar o resultado;
o site não controla essas opções do driver. Aguarde o botão “Imprimir comanda”
ficar disponível. Se o JavaScript/estilo não carregar, o fallback preserva o
conteúdo completo, mesmo que precise de mais páginas, em vez de cortar os itens.

Os testes de escala estão em `tests/receipt-print.test.mjs`. Para conferir o layout
com dados fictícios, execute `node tests/preview-receipt.mjs` e abra
`http://127.0.0.1:3002/?items=2` ou `http://127.0.0.1:3002/?items=200`.
Essa prévia usa os estilos de impressão na tela; não substitui a prova na impressora.
O ajuste combina o [CSS de impressão e o evento beforeprint](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing).

### Prévia de usabilidade do cardápio

Execute `node tests/preview-catalog.mjs` e abra `http://127.0.0.1:3003`.
A prévia usa os componentes reais com 60 produtos fictícios e ações simuladas em
memória: permite testar cadastro contínuo, variações, erros, busca, paginação e
largura do layout. Não consulta nem grava no Supabase. `esbuild` é usado apenas
nessa ferramenta de desenvolvimento; não é uma dependência da interface publicada.

## Estrutura de pastas

```text
app/
  (app)/              # área autenticada: dashboard, catálogo, clientes e pedidos
  auth/               # login, cadastro e callback de confirmação
  globals.css         # aparência mobile-first sem biblioteca de UI
components/           # peças de interface reutilizáveis
lib/
  supabase/           # clientes browser, servidor e renovação de sessão
  auth.ts             # contexto do usuário e empresa
  data.ts             # consultas de leitura
supabase/migrations/  # schema e regras de segurança do banco
types/                # tipos usados pela aplicação
```

## Próximas etapas recomendadas

1. Testar o fluxo completo com produtos e clientes reais.
2. Adicionar histórico individual de clientes; edição e exclusão protegida já estão disponíveis.
3. Definir a regra de estoque e criar uma função transacional para baixar/estornar movimentações ao mudar o status do pedido.
4. Criar convites de usuários com autorização por papel.
5. Publicar no Vercel, inserindo as mesmas variáveis de ambiente e adicionando a URL de produção aos Redirect URLs do Supabase.

## Publicação e GitHub

Para acessar de qualquer celular ou computador, publique o Next.js no **Vercel**. Ele entrega uma URL pública segura; depois é possível apontar um domínio próprio, como `espeto-hub.com.br`. O Supabase já é online e será acessado pela mesma aplicação publicada.

O **GitHub não é obrigatório** para o sistema funcionar, mas é altamente recomendado: ele mantém uma cópia do código, histórico das alterações e permite ao Vercel publicar automaticamente cada atualização. O fluxo mais simples é criar um repositório privado no GitHub, enviar esta pasta e importá-lo no Vercel. No Vercel, configure as três variáveis de `.env.local` e adicione a URL pública em **Authentication → URL Configuration** no Supabase.

## PWA

O projeto já inclui manifest, ícone e modo `standalone`, o que permite instalação em celulares compatíveis. O cache/offline será uma fase posterior: pedidos não devem ser aceitos offline sem definir uma estratégia de sincronização e prevenção de duplicidade.
