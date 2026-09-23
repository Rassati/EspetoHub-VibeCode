# Revisão técnica — Espeto Hub

Data: 22/09/2026. Alterações e verificações feitas no projeto local. Não houve publicação nem alteração do banco de produção.

## Resultado

A comanda não consulta nem mostra o endereço cadastrado. A identificação do cliente mantém nome e telefone; número do pedido, itens, valores, status e observações continuam presentes. Texto livre digitado nas observações não é filtrado automaticamente.

## Problemas encontrados e correções

| Área | Problema | Correção |
| --- | --- | --- |
| Pedidos com desconto | A função inseria desconto antes de calcular o subtotal, violando uma restrição do banco. | Migração 0005 atualiza os totais em conjunto, dentro da transação. O teste reproduz a falha antiga e verifica a correção. |
| Autenticação | Senhas eram aparadas; redirecionamentos e falhas de confirmação precisavam de tratamento. | Senha preservada, destino local validado, cookies renovados preservados nos redirecionamentos e erro de callback tratado. |
| Dados de entrada | Valores monetários, identificadores, quantidades e datas inválidos podiam chegar às ações. | Validações compartilhadas e limites explícitos; validações adicionais na função SQL de pedidos. |
| Histórico e dashboard | Limites fixos/padrão da API podiam ocultar pedidos ou subestimar totais. | Histórico paginado em 50 pedidos; catálogos e agregações leem lotes completos; contagens exatas. |
| Consultas | Consultas sequenciais e cálculos repetidos aumentavam o trabalho. | Consultas independentes em paralelo, contexto de autenticação deduplicado por renderização, índices de busca em memória e formatadores reutilizados. |
| Cadastro de produto | Falha na primeira variação podia deixar um produto incompleto. | Nova função transacional para produto e variação; compatibilidade temporária com bancos ainda sem a migração. |
| Fotos | Faltavam restrições de upload no servidor e política de leitura de metadados necessária à remoção. | Limite de 5 MB e MIME no bucket; política por empresa; validação de caminhos e proteção contra sobrescrita concorrente. |
| Interface | Cliques repetidos, falhas de rede e navegação móvel tinham tratamento limitado. | Estados de envio, bloqueio durante gravação, mensagens recuperáveis, saída da conta no celular e navegação ativa correta. |
| Privacidade da comanda | Endereço aparecia no documento. | Removido do HTML e da consulta específica de impressão; testes em ambas as camadas. |

## Verificação

- `npm run check`: TypeScript e 22 testes aprovados.
- `npm run build`: compilação de produção aprovada.
- Testes SQL executam PostgreSQL local em memória via PGlite, sem credenciais reais: descontos, rollback, isolamento entre empresas, status de entrega, cadastro transacional e políticas de Storage.
- Migração 0005 testada duas vezes no mesmo banco de teste para conferir reaplicação.
- Testes de consultas verificam totais com mais de 1.000 registros e ausência do endereço na consulta da comanda.
- Conferência visual da comanda usa dados fictícios e o componente real. A página comercial compilada abre; o histórico sem sessão redireciona para login preservando a página solicitada.

Esses testes não substituem uma validação autenticada no Supabase hospedado, o serviço real de Storage ou uma impressão física. Não foi medida redução percentual de tempo/carregamento em produção.

## Ativação pendente

1. No projeto Supabase correspondente, após backup e conferência das migrações 0003 e 0004, aplicar `supabase/migrations/0005_order_validation_and_storage.sql`.
2. Publicar o código pelo processo habitual do projeto. Esta revisão não publicou automaticamente.
3. Validar com uma conta de teste: produto com foto, pedido com desconto, mudança de status e impressão sem endereço.

Sem a migração, a correção de descontos, o cadastro transacional e as novas regras do bucket ainda não ficam ativos. O código mantém compatibilidade para cadastro de produto quando a nova função ainda não existe.

## Limitações e próximas melhorias

- Os papéis `owner`, `manager`, `seller` e `stock` existem no modelo, mas as políticas atuais usam associação à empresa. Restringir operações por papel exige definir a regra do negócio.
- Bloqueio de clique duplo não garante idempotência entre dispositivos ou após uma resposta de rede perdida. Uma chave de idempotência persistida é uma melhoria futura; a interface orienta conferir o histórico antes de repetir um envio incerto.
- O bucket de fotos é público por projeto. Isolamento de escrita não significa imagens privadas; não armazenar conteúdo confidencial nele.
- A leitura em lotes resolve truncamento, mas grandes volumes justificarão agregações SQL e paginação/busca de clientes e catálogo no servidor. Avaliar com métricas reais antes de ampliar a arquitetura.
- Não foram alteradas regras de estoque, pagamentos ou permissões por papel sem definição funcional.

## Skills online utilizadas

As orientações de [React Best Practices da Vercel](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices) guiaram a execução paralela de consultas, o cache limitado à requisição e a redução de cálculos repetidos. A skill [Frontend Design](https://github.com/anthropics/skills/tree/main/skills/frontend-design) orientou a apresentação comercial e a coerência visual. Não foi necessária instalação permanente dessas skills, nem biblioteca adicional de interface; seu uso não garante menor consumo de créditos.
