# Guia de Segurança — nb-store (MVP)

Data: **2025-12-16**  
Objetivo: checklist e padrões obrigatórios de hardening para o MVP.

---

## 1) Checklist mínimo (obrigatório)
- [ ] Validação via `FormRequest` em endpoints críticos
- [ ] Auth obrigatório para compra e downloads (sem guest checkout)
- [ ] Policies no admin (RBAC + níveis)
- [ ] Rate limiting (login, webhooks, downloads)
- [ ] Webhooks idempotentes
- [ ] Downloads digitais: `auth` + `signed` + logs + limites
- [ ] Uploads: validar mime/extensão/tamanho
- [ ] Logs sem secrets (tokens/keys nunca)
- [ ] CSRF padrão em forms; webhook sem CSRF mas com verificação própria
- [ ] XSS: escapar comentários; sanitizar HTML do blog se permitido

---

## 2) Rate limiting (padrão)
### 2.1 Definição
- login: 5/min por email+ip
- webhooks: 120/min por ip
- downloads: 30/min por user+ip

**Exemplo**
```php
RateLimiter::for('downloads', fn (Request $r) =>
    Limit::perMinute(30)->by('downloads|'.($r->user()?->id ?? 'guest').'|'.$r->ip())
);
```

---

## 3) Webhooks PagSeguro (idempotência)
### 3.1 Requisitos
- `provider_reference` unique
- transação + `lockForUpdate`
- efeitos colaterais com guardas

**Pseudo-fluxo**
1. validar assinatura/secret
2. buscar payment por provider_reference (lock)
3. se já processado → return 200
4. salvar payload/atualizar status
5. chamar `MarkOrderPaid` (idempotente)

---

## 4) Downloads digitais (anti-leak)
### 4.1 Requisitos
- storage privado (`storage/app/digital`)
- signed route
- auth obrigatório
- entitlement ownership + expiração + max downloads
- logs (ip, ua)

**Exemplo de guards**
```php
abort_unless($request->hasValidSignature(), 401);
abort_unless($entitlement->user_id === $request->user()->id, 403);
```

---

## 5) Uploads
- Para imagens: `image|mimes:jpg,jpeg,png,webp|max:5120`
- Para digitais: `file|max:<tamanho>` e salvar em disk `local` (privado)

---

## 6) XSS e conteúdo do blog
- Comentários: sempre `{{ $comment->body }}`
- Posts:
  - se HTML: sanitizar com lib mantida e atualizada
  - se Markdown: render seguro e sanitizado (sem inline HTML ou com sanitize)

---

## 7) Logging
- Logar:
  - ids, status e outcomes
- Não logar:
  - tokens OAuth
  - secrets (PagSeguro/Discord/FX)
  - payloads completos se contiverem PII/segredos

---

## 8) LGPD
- Consentimento cookies versionado
- Export e delete via jobs
- Evitar reter mais dados do que o necessário
- Definir política de anonimização mantendo integridade de pedidos
