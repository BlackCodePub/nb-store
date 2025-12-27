# Checklist de Code Review — nb-store (Next.js)

Data: **2025-12-18**

Use este checklist para revisar PRs (humanos e agentes).

---

## 1) Segurança
- [ ] Validação server-side com zod em server actions/route handlers
- [ ] Auth + RBAC aplicados corretamente (NextAuth + guards no servidor)
- [ ] Rate limiting em login/webhook/download (Edge/middleware)
- [ ] Webhook PagSeguro idempotente (unique `provider_reference` + lock lógico)
- [ ] Downloads: auth + entitlement + signed URL + throttle
- [ ] Uploads: validação e storage privado (S3/R2) sem expor paths reais
- [ ] Logs sem secrets/PII desnecessária

---

## 2) Consistência com contratos do MVP
- [ ] Sem guest checkout
- [ ] Estoque baixa só em `paid`
- [ ] Cupom não desconta frete
- [ ] Sessões separadas loja/admin (cookies/hosts)
- [ ] BRL base + USD por FX diário (pedido salva `fx_rate_used`)

---

## 3) Qualidade do código
- [ ] Componentes/rotas finos; regras em serviços/server modules
- [ ] Transações nos pontos críticos (PagSeguro, estoque, entitlements)
- [ ] Código comentado em pt-BR (arquivo + funções)
- [ ] Nomes consistentes (Store/Admin/API)
- [ ] Sem acoplamento ao client para lógica sensível (sempre no servidor)

---

## 4) Operação / Deploy
- [ ] Mudanças em env/cron/webhooks documentadas
- [ ] Migrações Prisma seguras e reversíveis quando possível
- [ ] Sem dependências que quebrem bundle/edge

---

## 5) Testes
- [ ] Unit tests para pricing/coupon quando alterado
- [ ] API/feature tests para webhook/download quando alterado
- [ ] Cobertura mínima para regressão do MVP
