# Threat Model (MVP) — nb-store

Data: **2025-12-16**  
Objetivo: mapear ameaças principais e mitigação mínima viável para o MVP.

---

## 1) Superfícies de ataque principais
1. Autenticação (login/reset)
2. Admin (RBAC, enumeração, escalonamento de privilégio)
3. Webhooks (forja, replay, duplicação)
4. Downloads digitais (exfiltração, link sharing, brute-force)
5. Uploads (RCE via arquivo, DOS por tamanho)
6. Integrações externas (Correios, PagSeguro, Discord, FX)

---

## 2) Ameaças e mitigação (por área)

### 2.1 Auth
**Ameaças**
- brute force login
- enumeração de e-mail

**Mitigação**
- throttle por email+ip
- mensagens genéricas (“credenciais inválidas”)
- logs de tentativas sem dados sensíveis

### 2.2 Admin (RBAC)
**Ameaças**
- usuário de baixo nível tentar ver/editar super-admin
- bypass via endpoints diretos

**Mitigação**
- policies em todas ações
- regra de “níveis/invisibilidade”
- auditoria mínima em ações sensíveis

### 2.3 Webhooks
**Ameaças**
- webhook forjado
- replay/duplicação
- race conditions

**Mitigação**
- secret/assinatura
- `provider_reference` unique
- lock/transação
- idempotência

### 2.4 Downloads digitais
**Ameaças**
- link compartilhado
- guessing ids
- brute-force
- path traversal

**Mitigação**
- signed routes
- auth + ownership
- throttle downloads
- `Storage::disk('local')->download($path)` com path controlado
- logs de downloads

### 2.5 Uploads
**Ameaças**
- upload de arquivo executável
- DOS por arquivo gigante

**Mitigação**
- validação mime/extensão/tamanho
- armazenar fora de public (digitais)
- limitar tamanho e tipo

### 2.6 Integrações externas
**Ameaças**
- SSRF (URLs externas)
- secrets vazando em logs
- indisponibilidade do provedor

**Mitigação**
- whitelists/validações de URL (quando aplicável)
- logs sanitizados
- UX e retry controlado

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
