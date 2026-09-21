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
  └─ Futuro: Storage, Edge Functions / integração WhatsApp
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

1. Crie um projeto em [Supabase](https://supabase.com/dashboard/projects) e, no **SQL Editor**, execute todo o conteúdo de `supabase/migrations/0001_initial_schema.sql`.
2. Em **Authentication → URL Configuration**, adicione `http://localhost:3000/auth/callback` como Redirect URL. Para o primeiro teste mais simples, em **Authentication → Providers → Email**, você pode desativar a confirmação de e-mail temporariamente. Com ela ativa, confirme o e-mail recebido antes de entrar.
3. Copie `.env.example` para `.env.local` e preencha a URL, a chave publishable/anon e a URL local da aplicação. Em produção, altere `NEXT_PUBLIC_SITE_URL` para a URL final do Vercel. Nunca use a `service_role` no navegador ou em `NEXT_PUBLIC_*`.
4. Instale as dependências e inicie a aplicação:

   ```bash
   npm install
   npm run dev
   ```

5. Abra `http://localhost:3000`, crie a primeira conta/empresa, cadastre produtos e clientes e faça um pedido.

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
2. Adicionar edição e histórico individual de clientes.
3. Definir a regra de estoque e criar uma função transacional para baixar/estornar movimentações ao mudar o status do pedido.
4. Criar convites de usuários com autorização por papel.
5. Publicar no Vercel, inserindo as mesmas variáveis de ambiente e adicionando a URL de produção aos Redirect URLs do Supabase.

## Publicação e GitHub

Para acessar de qualquer celular ou computador, publique o Next.js no **Vercel**. Ele entrega uma URL pública segura; depois é possível apontar um domínio próprio, como `espeto-hub.com.br`. O Supabase já é online e será acessado pela mesma aplicação publicada.

O **GitHub não é obrigatório** para o sistema funcionar, mas é altamente recomendado: ele mantém uma cópia do código, histórico das alterações e permite ao Vercel publicar automaticamente cada atualização. O fluxo mais simples é criar um repositório privado no GitHub, enviar esta pasta e importá-lo no Vercel. No Vercel, configure as três variáveis de `.env.local` e adicione a URL pública em **Authentication → URL Configuration** no Supabase.

## PWA

O projeto já inclui manifest, ícone e modo `standalone`, o que permite instalação em celulares compatíveis. O cache/offline será uma fase posterior: pedidos não devem ser aceitos offline sem definir uma estratégia de sincronização e prevenção de duplicidade.
