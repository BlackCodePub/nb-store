# Checklist de Code Review — nb-store (MVP)

Data: **2025-12-16**

Use este checklist para revisar PRs (humanos e agentes).

---

## 1) Segurança
- [ ] Validação via FormRequest
- [ ] Auth + policies aplicadas corretamente
- [ ] Rate limiting em login/webhook/download (quando aplicável)
- [ ] Webhook idempotente (unique + lock + guardas)
- [ ] Downloads: signed + ownership + logs + path seguro
- [ ] Uploads: validação e storage correto (digitais fora de public)
- [ ] Logs sem secrets/PII desnecessária

---

## 2) Consistência com contratos do MVP
- [ ] Sem guest checkout
- [ ] Estoque baixa só em `paid`
- [ ] Cupom não desconta frete
- [ ] Sessões separadas loja/admin
- [ ] BRL base + USD por FX diário (pedido salva `fx_rate_used`)

---

## 3) Qualidade do código
- [ ] Controllers finos
- [ ] Services/Actions para regras complexas
- [ ] Transações nos pontos críticos
- [ ] Código comentado em pt-BR (arquivo + funções)
- [ ] Nomes consistentes (Store/Admin/Webhooks)

---

## 4) Operação / Deploy
- [ ] Mudanças em env/cron/webhooks documentadas
- [ ] Migrações reversíveis quando possível
- [ ] Sem alterações que exijam infra não disponível no shared hosting

---

## 5) Testes
- [ ] Unit tests para pricing/coupon quando alterado
- [ ] Feature tests para webhook/download quando alterado
- [ ] Cobertura mínima para regressão do MVP
