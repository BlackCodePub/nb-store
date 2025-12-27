# Threat Model (MVP) — nb-store (Next.js)

Data: **2025-12-18**  
Objetivo: mapear ameaças principais e mitigação mínima viável para o MVP na stack Next.js.

---

## 1) Superfícies de ataque principais
1. Autenticação (NextAuth: login/reset, OAuth Discord)
2. Admin (RBAC, enumeração, escalonamento de privilégio)
3. Webhooks (forja, replay, duplicação)
4. Downloads digitais (exfiltração, link sharing, brute-force)
5. Uploads (arquivo malicioso, DOS por tamanho)
6. Integrações externas (Correios, PagSeguro, Discord, FX)

---

## 2) Ameaças e mitigação (por área)

### 2.1 Auth
**Ameaças**
- brute force login
- enumeração de e-mail

**Mitigação**
- throttle por email+ip (middleware edge)
- mensagens genéricas
- logs sem dados sensíveis

### 2.2 Admin (RBAC)
**Ameaças**
- usuário de baixo nível tentar ver/editar super-admin
- bypass via chamadas diretas à API

**Mitigação**
- guards em server actions/route handlers
- regra de níveis/invisibilidade nas queries
- auditoria mínima

### 2.3 Webhooks
**Ameaças**
- webhook forjado
- replay/duplicação
- race conditions

**Mitigação**
- secret/assinatura
- `provider_reference` unique
- transação/lock + idempotência

### 2.4 Downloads digitais
**Ameaças**
- link compartilhado
- guessing ids
- brute-force de signed URL
- path traversal (se usar storage local)

**Mitigação**
- signed URLs curtas + auth + ownership
- throttle downloads
- logs de download
- nunca expor path real

### 2.5 Uploads
**Ameaças**
- upload de arquivo executável
- DOS por arquivo gigante

**Mitigação**
- validação mime/extensão/tamanho
- armazenar em bucket privado
- limitar tamanho e tipo

### 2.6 Integrações externas
**Ameaças**
- SSRF
- secrets vazando em logs
- indisponibilidade dos provedores

**Mitigação**
- whitelists/validação de URLs
- logs sanitizados
- UX + retry controlado

---

## 3) Riscos aceitos no MVP
- oversell por ausência de reserva de estoque em `pending`
- disponibilidade variável de integrações externas (Correios/Discord)

---

## 4) Itens “não-negociáveis”
- idempotência de webhook
- downloads assinados
- rate limiting em login/webhook/download
- logs sem secrets
