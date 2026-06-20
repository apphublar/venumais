# Plano de implementação do VENUMAIS

Este documento acompanha a transformação do protótipo em uma aplicação de
produção. As fases são executadas em ordem e cada integração externa terá
ambientes separados para desenvolvimento, preview e produção.

## Fase 1 — Fundação técnica

- [x] Adotar Next.js, React e TypeScript.
- [x] Criar estrutura `src/app`.
- [x] Preparar scripts de desenvolvimento, lint, tipos e build.
- [x] Criar `.env.example` sem segredos.
- [x] Aplicar headers iniciais de segurança.
- [x] Preservar o protótipo legado como referência.
- [x] Instalar dependências e gerar lockfile.
- [x] Validar lint, TypeScript e build de produção.
- [x] Inicializar o repositório Git.
- [ ] Publicar o repositório Git.

## Fase 2 — Supabase e arquitetura multiempresa

- [x] Criar um projeto Supabase exclusivo para o VENUMAIS.
- [ ] Configurar URLs de autenticação de desenvolvimento.
- [x] Adicionar as variáveis públicas ao ambiente local.
- [x] Instalar os clientes oficiais do Supabase.
- [x] Validar a conexão com o Supabase Auth.
- [x] Criar a primeira migration versionada.
- [x] Modelar lojas, perfis e membros.
- [ ] Modelar clientes.
- [ ] Modelar produtos, estoque, pedidos, vendas, parcelas e pagamentos.
- [x] Ativar RLS nas tabelas iniciais expostas.
- [x] Criar políticas iniciais para proprietário, administrador e vendedor.
- [ ] Criar funções transacionais para registrar vendas e movimentar estoque.
- [ ] Criar dados de demonstração isolados.

## Fase 3 — Autenticação e onboarding

- [ ] Cadastro do proprietário.
- [ ] Criação da loja e slug exclusivo.
- [ ] Login, logout e recuperação de senha.
- [ ] Convite e gerenciamento da equipe.
- [ ] Portal autenticado do cliente.
- [ ] Proteção de rotas e validação de autorização no servidor.

## Fase 4 — Operação da loja

- [ ] Clientes.
- [ ] Produtos, variações e categorias.
- [ ] Estoque e movimentações.
- [ ] Pedidos e orçamentos.
- [ ] Vendas à vista e parceladas.
- [ ] Agenda de parcelas e inadimplência.
- [ ] Registro manual de pagamentos.
- [ ] Cupons, recibos e histórico de auditoria.

Os pagamentos das vendas acontecem diretamente entre cliente e vendedor. O
VENUMAIS registra o meio combinado e o status, mas não recebe nem repassa esse
dinheiro.

## Fase 5 — Cloudflare R2

- [ ] Criar bucket público para logos e fotos de produtos.
- [ ] Criar bucket privado para comprovantes.
- [ ] Criar token limitado apenas aos buckets do VENUMAIS.
- [ ] Implementar upload seguro pelo backend.
- [ ] Implementar URLs temporárias para arquivos privados.
- [ ] Configurar domínio de assets após o registro de `venumais.com.br`.

## Fase 6 — Resend

- [ ] Verificar o domínio de envio.
- [ ] Configurar SPF, DKIM e DMARC no Cloudflare.
- [ ] Implementar e-mails de boas-vindas e recuperação.
- [ ] Implementar recibos e avisos de assinatura.
- [ ] Processar webhooks de entrega, rejeição e reclamação.

## Fase 7 — Stripe Billing

- [ ] Definir planos, valores e período de teste.
- [ ] Criar produtos e preços no modo de teste.
- [ ] Implementar Checkout de assinatura.
- [ ] Implementar Customer Portal.
- [ ] Validar webhooks com assinatura.
- [ ] Sincronizar status da assinatura com a loja.
- [ ] Criar período de tolerância e bloqueio controlado.
- [ ] Repetir configuração no modo de produção.

O Stripe será usado somente para a mensalidade do VENUMAIS.

## Fase 8 — Qualidade, segurança e LGPD

- [ ] Validação de entrada no servidor.
- [ ] Rate limiting e Cloudflare Turnstile.
- [ ] Idempotência em vendas, webhooks e mensagens.
- [ ] Testes unitários, integração e ponta a ponta.
- [ ] Monitoramento de erros e eventos críticos.
- [ ] Rotina de backup e teste de restauração.
- [ ] Termos de uso, privacidade e consentimentos.
- [ ] Exportação e exclusão de dados pessoais.

## Fase 9 — Vercel, homologação e produção

- [ ] Criar projeto Vercel e conectar ao repositório.
- [ ] Configurar variáveis por ambiente.
- [ ] Criar deployment de preview.
- [ ] Executar homologação com uma loja piloto.
- [ ] Registrar `venumais.com.br`.
- [ ] Configurar DNS no Cloudflare.
- [ ] Configurar domínio na Vercel, Supabase, Resend e Stripe.
- [ ] Fazer deploy de produção.
- [ ] Monitorar logs, webhooks e primeiros usuários.
