# Troubleshooting — nb-store (MVP)

Data: **2025-12-16**

## 1) Admin e Loja “deslogando” ou conflitando sessão
**Sintoma:** loga no admin e desloga na loja (ou vice-versa).

**Causa provável:** cookie de sessão compartilhado por `SESSION_DOMAIN=.nobugs.com.br`.

**Correção (MVP):**
- `SESSION_DOMAIN=` (vazio)
- se necessário, usar cookie names diferentes para loja/admin

Ver `docs/02-setup/CONFIGURATION.md` e `docs/04-dev/AGENTS.md`.

---

## 2) Webhook PagSeguro duplicando efeitos
**Sintoma:** estoque baixa duas vezes, entitlements duplicados, e-mails duplicados.

**Causa:** falta de idempotência.

**Correção:**
- `payments.provider_reference` unique
- lock + transação no handler
- guardas em `MarkOrderPaid`

Ver `docs/03-security/SECURITY_GUIDE.md`.

---

## 3) Downloads digitais expostos publicamente
**Sintoma:** link direto para arquivo digital acessível sem login.

**Causa:** arquivo colocado em `public/` ou `storage/app/public`.

**Correção (MVP):**
- digitais em `storage/app/digital/*` (disk `local`)
- servir via controller com `auth` + `signed` + throttle + logs

---

## 4) Cron/Queue não executando
**Sintoma:** FX rate não atualiza, e-mails em job não enviam, export LGPD não roda.

**Causas comuns:**
- cron não configurado
- path do PHP/artisan incorreto
- permissões em `storage/` e `bootstrap/cache/`

**Correção:**
- configurar `schedule:run` e `queue:work` por minuto
- checar logs em `storage/logs/laravel.log`
- checar `failed_jobs`

---

## 5) Correios não retorna cotação
**Causas comuns:**
- credenciais incorretas (se API exigir)
- origem/CEP inválidos
- timeout/rede

**Mitigação:**
- tratar fallback UX (“frete indisponível”)
- logar erro sem dados sensíveis
- retry controlado (não travar checkout)

---

## 6) Discord gating falhando
**Causas comuns:**
- tokens expirados (precisa refresh)
- scopes insuficientes no OAuth
- guild/role id incorretos

**Mitigação:**
- UX clara com CTA para reconectar
- logs sanitizados (sem tokens)
- page de “status da conexão Discord” na conta
