# nb-store — Guidelines (MVP, Next.js)

Data: **2025-12-18**  
Repo: **BlackCodePub/nb-store (variant Next.js)**  
Stack: **Next.js 14 + TypeScript + Bootstrap + Prisma + MySQL**  
Hospedagem: **Vercel**

Este documento define padrões de implementação, convenções e regras de contribuição para manter o projeto consistente e “MVP-friendly”.

---

## 1) Princípios do projeto
1. **MVP primeiro**: soluções simples, legíveis e operáveis em serverless.
2. **App Router organizado**: separar segmentos Loja/Admin e `api` handlers.
3. **Segurança por padrão**: downloads assinados, rate limiting, validações fortes, logs com cuidado.
4. **Idempotência e consistência**: webhooks e transições de pedido reprocessáveis.
5. **Snapshots em pedidos**: nunca depender de preço/nome atuais do produto para pedidos antigos.
6. **Loja e Admin isolados**: sessões separadas e RBAC rígido.

---

## 2) Convenções de branches e commits
### Branches
- `main`: produção/estável
- `dev`: integração (opcional)
- `feature/<slug>`: novas features
- `fix/<slug>`: correções
- `hotfix/<slug>`: urgente em produção

### Commits (Conventional)
- `feat: ...`
- `fix: ...`
- `chore: ...`
- `refactor: ...`
- `docs: ...`
- `test: ...`

---

## 3) Organização de código
### App Router / Segmentos
- `app/(store)/*` → Loja
- `app/(admin)/*` → Admin
- `app/api/*` → APIs, webhooks, auth callbacks

### Server modules / Serviços
- `src/server/payments/*` (PagSeguro)
- `src/server/shipping/*` (Correios)
- `src/server/pricing/*` (cupons, totais)
- `src/server/discord/*` (gating)
- `src/server/fx/*` (câmbio)
- `src/server/digital/*` (entitlements/downloads)

### Validação
- `src/server/validation/*` (zod schemas)
- Nunca confiar em dados do cliente; validar no servidor.

### Prisma / DB
- `prisma/schema.prisma`
- `src/server/db/*`

### UI / Componentes
- `src/components/ui/*` (Bootstrap-based)
- `src/components/store/*`
- `src/components/admin/*`

---

## 4) Naming e padrões de código
### Arquivos/ funções
- Use `kebab-case` para arquivos de rotas, `PascalCase` para componentes, `camelCase` para funções.
- Prefira nomes verbais claros: `quoteShipping`, `createCheckout`, `applyCoupon`, `markOrderPaid`.

### Config/env
- Usar `process.env` apenas em server modules/config helpers; nunca expor secrets ao client.

---

## 5) Regras de negócio: “contratos” que não podem quebrar
- Sessões separadas Loja/Admin (cookies/hosts distintos).
- `pending` **não** baixa estoque; baixa em `paid`.
- Cupom não afeta frete; aplica só em itens elegíveis.
- Webhooks PagSeguro idempotentes; efeitos (estoque/entitlements/emails) não duplicam.
- Digital: bucket privado; auth + entitlement + signed URL + logs.
- Discord gating checado no checkout **e** no download.
- BRL base; USD conversão diária; `fx_rate_used` no pedido.

---

## 6) Banco de dados e migrations
- Prisma migrations versionadas; aplicar com `prisma migrate deploy` em prod.
- Índices/uniques importantes:
  - `coupons.code` unique
  - `payments.provider_reference` unique
- Snapshots em `order_items` (nome, preço, desconto, tipo).

---

## 7) Tratamento de erros e UX
### Loja
- Mensagens claras em falha de pagamento, cupom inválido, frete indisponível, falta de acesso Discord, download expirado.

### Admin
- Feedback consistente (toasts/alerts Bootstrap)
- Logs/auditoria mínima para ações sensíveis.

---

## 8) Segurança
- Rate limiting: login, reset, webhooks, downloads.
- Uploads: validar mime/size/ext; salvar privado quando sensível.
- Webhooks: assinatura/token; logs sanitizados.

---

## 9) Jobs, queue e scheduler
- Cron (Vercel) para FX diário e housekeeping.
- Fila opcional (Redis/BullMQ) para tarefas longas.
- Jobs idempotentes/reentrantes.

---

## 10) Testes (mínimo)
- Unit: `pricing/coupon`, `order total`, `fx`.
- API/Feature: criação de pedido `pending`; webhook `paid` marca e baixa estoque; download protegido.

---

## 11) Padrões para issues/PRs
- Issues: contexto, critérios de aceite, estimativa, referências de código.
- PRs: descrição, prints (UI), checklist de migrations/config/cron/webhooks.

---

## 12) Checklist de “Definition of Done” (DoD)
- [ ] Critérios de aceite atendidos
- [ ] Validações e mensagens de erro implementadas
- [ ] Logs essenciais (quando crítico)
- [ ] Segurança aplicada (auth/rate limit)
- [ ] Não quebra decisões do MVP
- [ ] Docs atualizadas se mudar operação

---

## 13) Referências
- `README.md`
- `PROJECT_BLUEPRINT.md`
- `ARCHITECTURE.md`
- `CONFIGURATION.md`
- `DIAGRAMS.md`
- `ROADMAP.md`
- `TASKS.md`
