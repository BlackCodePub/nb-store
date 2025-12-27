# Definition of Done (DoD) — nb-store (Next.js)

Data: **2025-12-18**

Este DoD define o mínimo para considerar uma tarefa “pronta” na variante Next.js.

---

## 1) DoD geral (todas as mudanças)
- [ ] Código novo comentado (arquivo + funções) em pt-BR
- [ ] Validações server-side com zod quando houver input
- [ ] Sem quebra dos “contratos” do MVP
- [ ] Documentação em `docs/` atualizada quando aplicável
- [ ] Sem vazamento de secrets em logs
- [ ] Testes atualizados quando houver lógica crítica

---

## 2) DoD para features críticas
### 2.1 Pagamentos/webhooks (PagSeguro)
- [ ] Idempotência comprovada (reprocessar webhook não duplica efeitos)
- [ ] Transação/lock ao atualizar pagamento e pedido
- [ ] Logs úteis + sanitizados
- [ ] Throttle aplicado
- [ ] Teste cobrindo cenários principais

### 2.2 Downloads digitais
- [ ] Auth + entitlement + signed URL + throttle
- [ ] Ownership check
- [ ] Logs de download
- [ ] Limite e expiração (se implementados)
- [ ] Teste feature

### 2.3 Admin (RBAC)
- [ ] Policies/guards em todos endpoints/admin routes
- [ ] Regra de níveis (“invisibilidade”) aplicada
- [ ] Teste de acesso/bypass básico

---

## 3) DoD para mudanças operacionais (deploy/cron/env)
- [ ] `docs/CONFIGURATION.md` atualizado
- [ ] `docs/DEPLOYMENT.md` atualizado
- [ ] Checklist de smoke test executado
