# Definition of Done (DoD) — nb-store (MVP)

Data: **2025-12-16**

Este DoD define o mínimo para considerar uma tarefa “pronta” no MVP.

---

## 1) DoD geral (todas as mudanças)
- [ ] Código novo comentado (arquivo + funções) em pt-BR
- [ ] Validações via FormRequest quando houver input
- [ ] Sem quebra dos “contratos” do MVP
- [ ] Documentação em `docs/` atualizada quando aplicável
- [ ] Sem vazamento de secrets em logs
- [ ] Testes atualizados quando houver lógica crítica

---

## 2) DoD para features críticas
### 2.1 Pagamentos/webhooks
- [ ] Idempotência comprovada (reprocessar webhook não duplica efeitos)
- [ ] Transação + lock (quando necessário)
- [ ] Logs úteis + sanitizados
- [ ] Throttle aplicado
- [ ] Teste feature cobrindo cenários principais

### 2.2 Downloads digitais
- [ ] `auth` + `signed` + throttle
- [ ] ownership check
- [ ] logs de download
- [ ] limite e expiração (se implementados)
- [ ] teste feature

### 2.3 Admin (RBAC)
- [ ] policies em todos endpoints
- [ ] regra de níveis (“invisibilidade”)
- [ ] teste feature para bypass básico

---

## 3) DoD para mudanças operacionais (deploy/cron/env)
- [ ] `docs/02-setup/CONFIGURATION.md` atualizado
- [ ] `docs/02-setup/DEPLOYMENT.md` atualizado
- [ ] Checklist de smoke test executado
