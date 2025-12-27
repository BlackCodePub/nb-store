# Troubleshooting — nb-store (Next.js)

Data: **2025-12-18**

## 1) Admin e Loja “deslogando” ou conflitando sessão
**Sintoma:** loga no admin e desloga na loja (ou vice-versa).

**Causa provável:** cookies/sessão compartilhados ou `NEXTAUTH_URL` incorreto.

**Correção (MVP):**
- definir cookies names distintos por host (middleware ou NextAuth config)
- garantir `NEXTAUTH_URL` correto para cada ambiente/domínio

---

## 2) Webhook PagSeguro duplicando efeitos
**Sintoma:** estoque baixa duas vezes, entitlements duplicados, e-mails duplicados.

**Causa:** falta de idempotência/lock.

**Correção:**
- `payments.provider_reference` unique
- lock + transação no handler
- guardas em `markOrderPaid` server action

---

## 3) Downloads digitais expostos publicamente
**Sintoma:** link direto para arquivo digital acessível sem login.

**Causa:** arquivo colocado em bucket público ou URL assinada longa demais.

**Correção (MVP):**
- usar bucket privado + signed URL curta
- validar entitlement + auth antes de gerar URL

---

## 4) Cron/Jobs não executando
**Sintoma:** FX rate não atualiza, e-mails em job não enviam, export LGPD não roda.

**Causas comuns:**
- Vercel Cron não configurado
- path/handler incorreto
- falha de credenciais

**Correção:**
- configurar cron na Vercel (ou provider) para endpoints corretos
- checar logs e métricas

---

## 5) Correios não retorna cotação
**Causas comuns:**
- credenciais incorretas
- origem/CEP inválidos
- timeout/rede

**Mitigação:**
- fallback UX (“frete indisponível”)
- logar erro sem dados sensíveis
- retry controlado

---

## 6) Discord gating falhando
**Causas comuns:**
- tokens expirados (precisa refresh)
- scopes insuficientes no OAuth
- guild/role id incorretos

**Mitigação:**
- UX clara com CTA para reconectar
- logs sanitizados (sem tokens)
- página de status da conexão Discord na conta
