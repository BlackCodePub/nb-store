# nb-store (Next.js + Bootstrap)

E-commerce (tema fixo) construído em **Next.js 14 (App Router) + TypeScript** para venda de **produtos físicos e digitais**, com checkout multi-etapas, PagSeguro, frete via Correios, entrega digital segura e regras de acesso via Discord.

> Status: MVP em construção (documentação e backlog definidos para a variante Next.js)

---

## Domínios sugeridos

### Produção

- Loja: `https://nobugs.com.br`
- Admin: `https://admin.nobugs.com.br`
- API (route handlers): `https://api.nobugs.com.br` (opcional, pode compartilhar domínio com App Router)

### Desenvolvimento

- Loja: `https://localhost:3000`
- Admin: `https://admin.localhost:3000` (via host mapping)
- API: `https://api.localhost:3000` (opcional)

**Importante:** Loja e Admin usam **sessões separadas** (cookies isolados por host) via NextAuth e cookies distintos.

---

## Principais features (MVP)

### Loja (web)

- Catálogo com **pt-BR / en-US**
- Produtos **físicos** e **digitais**
- **Variações** (ex.: licença/tamanho/cor) + snapshots no pedido
- Carrinho (usuário precisa estar logado; **sem guest checkout**)
- Checkout multi-etapas:
  1) Endereço
  2) Frete (Correios)
  3) Pagamento (PagSeguro)
  4) Revisão/Confirmação
- Pagamento via **PagSeguro** com **parcelamento** (juros pagos pelo cliente)
- Entrega digital:
  - assets privados em storage S3-compatível
  - **links assinados** + limite de downloads + expiração
  - logs de download
- **Cupons** (global ou restrito por **produto/categoria**; **não** desconta frete)
- “Minha Conta”: pedidos, downloads, preferências (idioma/moeda)

### Admin (web)

- Dashboard + CRUD:
  - produtos, categorias, variações, imagens
  - pedidos + pagamentos
  - cupons
  - assets digitais
  - regras Discord
  - blog + comentários (moderação)
- RBAC (roles/permissões) com **níveis/hierarquia** e “invisibilidade”

### Integrações (MVP)

- **Correios (API direta)**: cotação de frete e seleção de serviço
- **PagSeguro**: criação de cobrança + webhooks (route handlers)
- **Discord gating**: exigir guild/role por produto/categoria para comprar e/ou baixar

### Conformidade (LGPD)

- Consentimento de cookies
- Exportação de dados
- Exclusão/anonimização de conta (processo assíncrono)

---

## Stack

- **Next.js 14 (App Router) + TypeScript**
- Bootstrap 5 (Sass, theme fixo) + Vite/Next bundler
- Prisma + MySQL (ou Postgres) como banco primário
- Auth: NextAuth (credentials + Discord OAuth)
- Queue/cron: Vercel Cron + background worker (Edge/Queue) para jobs diários
- Storage: S3/R2 privado para digitais; uploads públicos servidos via signed URLs/CDN
- Hospedagem: Vercel (ou similar com suporte a route handlers e cron)

---

## Estrutura sugerida do projeto

- App Router:
  - `app/(store)/*` (Loja)
  - `app/(admin)/*` (Admin)
  - `app/api/*` (route handlers para webhooks, auth, backend)
- Componentes/UI:
  - `src/components/ui/*` (Bootstrap-based)
  - `src/components/store/*`
  - `src/components/admin/*`
- Domínios/serviços:
  - `src/server/payments/*` (PagSeguro)
  - `src/server/shipping/*` (Correios)
  - `src/server/discord/*`
  - `src/server/pricing/*`
  - `src/server/fx/*`
- ORM/DB:
  - `prisma/schema.prisma`
  - `src/server/db/*`
- Jobs/Cron:
  - `src/jobs/*`
  - `vercel.json` (cron definitions)

---

## Setup local (guia rápido)

> Ajuste conforme o ambiente do time. Este é um baseline Next.js.

1) Instale dependências:

```bash
pnpm install
```

2;) Configure env:

```bash
cp .env.example .env.local
```

Preencha credenciais (DB, PagSeguro, Discord, storage, Auth secret).

3;) Gere banco e migre:

```bash
pnpm prisma migrate dev
```

4;) Rode o app:

```bash
pnpm dev
```

5;) Build de produção (para testes):

```bash
pnpm build && pnpm start
```

---

## Cron/Queue (Vercel ou similar)

- Cron diário para câmbio (job `fetch-exchange-rate`)
- Cron por minuto para workers simples (se suportado) ou use fila externa (Upstash/Redis + BullMQ) para tarefas recorrentes
- Webhooks PagSeguro em route handler `POST /api/webhooks/pagseguro` com idempotência

---

## Ambiente / Configuração (checklist)

No `.env.local` (prod):

- `DATABASE_URL` (MySQL/Postgres)
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- Credenciais PagSeguro + webhook secret
- Credenciais Discord OAuth
- Config Correios
- Config FX provider
- Storage S3/R2 (bucket privado) + chaves

---

## Documentação

- Veja `docs/PROJECT_BLUEPRINT.md` (escopo, decisões, modelo de dados, integrações e backlog macro).

---

## Licença

A definir.
