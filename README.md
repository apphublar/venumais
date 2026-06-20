# VENUMAIS

Aplicação de gestão de vendas, estoque, clientes e crediário para pequenos
negócios.

## Estado atual

A migração do protótipo estático para Next.js + TypeScript foi iniciada. A nova
aplicação fica em `src/`. Os arquivos `.jsx` existentes na raiz permanecem
temporariamente como referência visual e funcional durante a migração.

## Desenvolvimento local

Requisitos:

- Node.js 20.9 ou superior;
- pnpm 10 ou superior.

```bash
pnpm install
pnpm dev
```

Acesse `http://localhost:3000`.

Verificações:

```bash
pnpm typecheck
pnpm lint
pnpm build
```

## Ambientes

Copie `.env.example` para `.env.local` apenas quando as integrações começarem a
ser configuradas. Nunca envie `.env.local` ou chaves secretas para o Git.

Integrações planejadas:

- Supabase: banco, autenticação e segurança multiempresa;
- Cloudflare R2: fotos de produtos, logos e comprovantes;
- Resend: e-mails transacionais;
- Stripe Billing: mensalidade dos lojistas;
- Vercel: deploy, previews, rotas de API e webhooks.

## Protótipo legado

```bash
pnpm legacy:build
pnpm legacy:preview
```
