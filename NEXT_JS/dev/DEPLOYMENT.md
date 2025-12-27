# Deploy — Vercel (Next.js + Bootstrap) — nb-store

Data: **2025-12-18**  
Stack: Next.js 14 (App Router) + TypeScript + Bootstrap + Prisma + MySQL  
Objetivo: passo a passo operacional para publicar e manter o MVP em produção.

> Premissas do MVP:
> - Deploy em Vercel (ou plataforma compatível com App Router e route handlers)
> - Banco MySQL/Postgres gerenciado (PlanetScale/Railway/etc.)
> - Storage privado S3/R2 para assets digitais
> - Cron jobs via Vercel Cron (FX diário, limpezas)

---

## 1) Pré-requisitos
- Conta Vercel com projeto conectado ao repositório
- Banco provisionado (MySQL/Postgres) e `DATABASE_URL` configurado
- Bucket S3/R2 privado para digitais + credenciais
- Domínios configurados:
  - `nobugs.com.br` (loja)
  - `admin.nobugs.com.br` (admin) — apontar para o mesmo deploy com rewrite
- SSL ativo (Vercel gerencia automaticamente)
- Credenciais PagSeguro, Discord, e provider de e-mail

---

## 2) Build e variáveis

### 2.1 Variáveis obrigatórias
- `DATABASE_URL`
- `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
- `PAGSEGURO_*` (token, client_id, client_secret, webhook secret, webhook url)
- `DISCORD_*` (client id/secret, redirect)
- `EMAIL_*` (provider escolhido)
- `STORAGE_*` (S3 endpoint, bucket, key, secret, region)
- `FX_*` (provider/key)

### 2.2 Build
- Vercel usa `pnpm install`, `pnpm build` por padrão
- Certifique-se de que `prisma generate` roda no `postinstall`

---

## 3) Migrações
- Use migrations Prisma:
  - Local/staging: `pnpm prisma migrate dev`
  - Produção: `pnpm prisma migrate deploy` (Vercel build step ou job manual)
- Evite migrations destrutivas; garanta `down` quando possível.

---

## 4) Configuração de domínios e rewrites
- Configure `nobugs.com.br` e `admin.nobugs.com.br` na Vercel.
- Use middleware para definir cookies/sessão diferentes por host.
- Se preferir separar rotas, use grupos `(store)` e `(admin)` no App Router.

---

## 5) Webhooks (PagSeguro)
- Endpoint: `POST /api/webhooks/pagseguro`
- Proteger com assinatura/secret e idempotência por `provider_reference`.
- Retornar 200 em replays após confirmar processamento.

---

## 6) Cron jobs
- FX diário: agende via Vercel Cron (ex.: 03:00 BRT) chamando `GET /api/cron/fetch-fx` ou `pnpm tsx src/jobs/fetch-fx.ts` se usar queue externa.
- Limpeza de downloads expirados/logs (se aplicável): cron diário/semanal.

---

## 7) Storage
- Digitais armazenados em bucket privado (S3/R2) com políticas restritivas.
- Downloads via URL assinada gerada pelo servidor (nunca expor path real).
- Uploads públicos (imagens) podem usar bucket separado público + CDN.

---

## 8) Observabilidade / Logs
- Use logging estruturado (pino/winston) apenas no servidor.
- Sanitizar payloads de webhook (sem secrets/PII).
- Configure monitoring (Vercel Observability ou LogDrain) para erros.

---

## 9) Checklist pós-deploy (smoke test)
- [ ] Loja abre (home) e carrega CSS/Bootstrap
- [ ] Admin abre e autentica (sessão separada)
- [ ] Cadastro/login/verify email funciona (NextAuth + provider de e-mail)
- [ ] Carrinho e checkout avançam steps
- [ ] Correios retorna cotação
- [ ] PagSeguro cria cobrança
- [ ] Webhook atualiza pedido para `paid` (idempotente)
- [ ] Digitais liberam e download é assinado e logado
- [ ] FX rate atualizado (cron diário) e USD exibido quando selecionado

---

## 10) Rollback
- Manter última versão estável publicada na Vercel
- Reverter deploy via painel Vercel (Promote previous)
- Migrations: aplicar hotfix/migration corretiva se necessário
