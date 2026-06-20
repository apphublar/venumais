# Banco de dados VENUMAIS

As mudanças do banco são versionadas na pasta `migrations`. Não crie tabelas
manualmente pelo Table Editor; toda alteração estrutural deve possuir uma
migration SQL correspondente.

## Migration 001 — identidade multiempresa

Arquivo:

`migrations/20260618010000_initial_identity.sql`

Cria:

- `profiles`: perfil associado a `auth.users`;
- `stores`: lojas/tenants do VENUMAIS;
- `store_members`: vínculo de usuários com lojas e papéis;
- trigger de criação automática de perfil;
- trigger que adiciona o proprietário como membro da nova loja;
- funções auxiliares seguras;
- políticas RLS para proprietário, administrador e vendedor.

Nenhuma tabela fica acessível para usuários anônimos. A chave publicável só
consegue acessar dados quando existe um usuário autenticado e uma política RLS
autoriza a operação.

## Migration 002 — clientes

Arquivo:

`migrations/20260618120000_customers.sql`

Cria:

- `customers`: clientes isolados por loja;
- função `can_manage_customers` para respeitar permissões da equipe;
- políticas RLS para leitura por membros e escrita por quem pode gerenciar clientes.

## Migration 003 — produtos

Arquivo:

`migrations/20260618180000_products.sql`

Cria:

- `products`: produtos e estoque isolados por loja;
- função `can_manage_products` para respeitar permissões da equipe;
- políticas RLS para leitura por membros e escrita por quem pode gerenciar produtos.

## Migration 004 — vendas

Arquivo:

`migrations/20260618200000_sales.sql`

Cria:

- `sales`: vendas isoladas por loja, com código sequencial e totais;
- `sale_items`: itens vendidos com snapshot de preço e custo;
- `sale_installments`: parcelas do crediário com controle de pagamento;
- função `register_sale()` para registrar venda, parcelas e baixar estoque em uma transação;
- função `mark_installment_paid()` para confirmar pagamento de parcela;
- função `can_manage_sales` e políticas RLS por loja.

## Migration 005 — endereço estruturado do cliente

Arquivo:

`migrations/20260618210000_customer_address_fields.sql`

Adiciona em `customers`:

- `address_postal_code`, `address_street`, `address_number`, `address_complement`, `address_neighborhood`, `address_city`, `address_state`;
- o campo `address` continua guardando o endereço formatado para exibição.

## Aplicação manual inicial

Enquanto o Supabase CLI ainda não estiver ligado ao projeto:

1. Abra o SQL Editor do projeto VENUMAIS.
2. Crie uma nova query.
3. Cole todo o conteúdo da migration.
4. Execute uma única vez.
5. Confirme que a execução terminou sem erros.

Depois que o repositório e os ambientes estiverem ligados, migrations futuras
serão aplicadas pelo fluxo versionado, sem copiar SQL manualmente.
