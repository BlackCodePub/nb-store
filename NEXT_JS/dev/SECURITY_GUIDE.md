# Guia de Segurança — nb-store (Next.js)

Data: **2025-12-18**  
Objetivo: checklist e padrões obrigatórios de hardening para o MVP na stack Next.js.

---

## 1) Checklist mínimo (obrigatório)
- [ ] Validação com zod em server actions/route handlers
- [ ] Auth obrigatório para compra e downloads (sem guest checkout)
- [ ] RBAC no admin (roles/permissions + níveis)
- [ ] Rate limiting (login, webhooks, downloads)
- [ ] Webhooks idempotentes (PagSeguro)
- [ ] Downloads digitais: auth + entitlement + signed URL + limites + logs
- [ ] Uploads: validar mime/extensão/tamanho; armazenar privado quando sensível
- [ ] Logs sem secrets (tokens/keys nunca)
- [ ] CSRF protegido via NextAuth/anti-CSRF tokens nas rotas que precisam
- [ ] XSS: escapar/sanitizar inputs em rich text; usar React/Bootstrap componentes seguros

---

## 2) Rate limiting (padrão)
- login: 5/min por email+ip
- webhooks: 120/min por ip/provider
- downloads: 30/min por user+ip

Implementar via middleware/edge (ex.: `@upstash/ratelimit` com Redis) ou equivalente.

---

## 3) Webhooks PagSeguro (idempotência)
- `provider_reference` unique no DB
- route handler com assinatura/secret
- transação/lock ao atualizar payment/order
- replays retornam 200 sem duplicar efeitos

---

## 4) Downloads digitais (anti-leak)
- Bucket privado (S3/R2)
- Auth + entitlement + validade/limites
- URLs assinadas curtas (expiração pequena)
- Logs: IP + user-agent + entitlement_id

---

## 5) Uploads
- Validar mime/extensão/tamanho (server-side)
- Renomear arquivos (UUID) e salvar em bucket controlado
- Nunca confiar no nome original

---

## 6) XSS e conteúdo do blog
- Comentários: escapar sempre; sanitizar HTML (DOMPurify/rehype-sanitize)
- Markdown: render seguro sem HTML perigoso

---

## 7) Logging
- Logar eventos úteis (webhook, download, ações admin) sem secrets
- Redigir payloads sensíveis (remover tokens/PII)

---

## 8) LGPD
- Consentimento cookies versionado
- Export e delete via jobs
- Evitar reter mais dados do que o necessário
