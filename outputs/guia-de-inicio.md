# Espeto Hub — guia de início

O protótipo está montado na pasta raiz deste projeto.

1. Crie um projeto no Supabase.
2. No SQL Editor do Supabase, execute o arquivo `supabase/migrations/0001_initial_schema.sql` da raiz do projeto.
3. Copie `.env.example` para `.env.local` e preencha a URL, a chave publishable/anon e `NEXT_PUBLIC_SITE_URL`.
4. No terminal, na raiz do projeto, execute `npm run dev`.
5. Abra `http://localhost:3000`, crie sua empresa, cadastre um cliente e produtos, e registre o primeiro pedido.

O arquivo `README.md` na raiz explica o modelo de dados, as políticas de segurança, a arquitetura e os próximos passos.
