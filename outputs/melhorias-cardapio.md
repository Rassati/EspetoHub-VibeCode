# Cardápio mais prático para a churrascaria

## O que mudou

1. O cadastro não redireciona mais para a página do produto. Após salvar, mostra uma confirmação e oferece cadastrar o próximo, adicionar variações ou editar/colocar foto.
2. Produto simples pede apenas nome e preço. Descrição e unidades ficam em uma seção opcional. Para tipos/sabores/pacotes, marque “Este produto tem variações”.
3. Depois de salvar uma variação, o formulário fica pronto para a próxima e o foco volta ao nome. Esse fluxo também está disponível na página de edição de produtos já existentes.
4. Uma falha de validação não limpa os campos. Os botões ficam indisponíveis durante o envio. Respostas de rede incertas orientam conferir o catálogo antes de repetir.
5. Busca por produto ou variação, sem exigir acentos; filtro de ativos/inativos; páginas de 12 produtos. Variações encontradas pela busca têm prioridade no cartão.
6. A comanda, o detalhe e o resumo do pedido mostram **produto — variação** juntos em negrito. Exemplo: **2 × LINGUIÇAS — Toscana**. O nome genérico “Padrão” não é repetido na impressão de produtos simples.
7. Corrigidos pontos de overflow: largura mínima de 700 px no editor, colunas rígidas, nomes cortados, botões estreitos de variações e resumo comprimido. Campos no celular usam texto de 16 px; as opções exibem seus nomes completos.

Não é necessário recriar Linguiças ou suas variações. A identificação impressa usa os nomes já salvos nos pedidos. O endereço continua ausente da comanda e o ajuste para uma folha A4 foi preservado.

## Validação

- 32 testes automatizados aprovados; TypeScript e compilação de produção aprovados.
- Prévia local com os componentes reais e 60 produtos fictícios: cadastro de Linguiças/Toscana, inclusão de Apimentada no mesmo grupo, foco/limpeza após salvar, próximo produto, erro preservando nome/preço, busca por variação e segunda página do catálogo.
- Conferência de largura em 320, 390, 768, 1024 e 1440 px para catálogo e pedido: sem overflow horizontal nos cenários testados. Editor de variações também conferido em 320 px.
- Conferência visual da comanda com quatro tipos de linguiça, todos destacados e dentro da área de uma folha A4.
- Testes de servidor cobrem validação, retorno sem redirecionamento, isolamento por empresa, recusa de produto de outra empresa e compatibilidade com banco ainda sem a função transacional.

As ações da prévia são simuladas e não alteram os dados reais. A revisão não substitui testar a versão publicada com a impressora e o celular utilizados no balcão. Não houve publicação nem migração de banco nesta alteração. As melhorias de interface não exigem migração nova; a migração 0005 da revisão anterior continua necessária para as funcionalidades de banco que ela introduziu.

## Referências e decisões

Foram lidas as skills online [Frontend Design](https://github.com/anthropics/skills/tree/main/skills/frontend-design) e [React Best Practices da Vercel](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices), incluindo as regras de autenticação nas ações, buscas com `useDeferredValue` e índices `Map`.

O foco foi manter a identidade que a usuária já conhece, reduzir campos obrigatórios, usar rótulos explícitos e confirmação na própria tela. A hierarquia visual passou a destacar a escolha efetiva do cliente, não só o grupo do produto. Nenhuma biblioteca visual foi adicionada; esbuild serve apenas à prévia local de testes.
