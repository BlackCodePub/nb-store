# nb-store — Configuração (MVP, Next.js)

Data: **2025-12-18**  
Repo: **BlackCodePub/nb-store (variant Next.js)**  
Stack: **Next.js 14 + TypeScript + Bootstrap + Prisma + MySQL**  
Hospedagem: **Vercel**  
Storage: **S3/R2 privado para digitais**  
Queue/Cron: **Vercel Cron + opcional Redis/BullMQ**

Este documento lista as configurações necessárias (local/dev e produção) para rodar o projeto com o escopo e decisões do MVP.

---

## 1) Ambientes e domínios

### Produção
- Loja: `https://nobugs.com.br`
- Admin: `https://admin.nobugs.com.br`
- API (route handlers): `https://api.nobugs.com.br` (opcional)

### Desenvolvimento
- Loja: `http://localhost:3000`
- Admin: `http://admin.localhost:3000`
- API: `http://api.localhost:3000`

**Decisão:** Loja e Admin usam **sessões separadas** (cookies distintos).

---

## 2) `.env.local` — Variáveis obrigatórias (MVP)

### 2.1 App / NextAuth
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=...
NEXT_PUBLIC_APP_LOCALE=pt-BR
auth_cookie_name=nb_store_session
admin_auth_cookie_name=nb_admin_session
```
**Observações**
- Use cookies distintos por host (loja/admin) e mantenha `NEXTAUTH_URL` igual ao domínio do deploy/preview.
- Não exponha secrets em client components; acesse envs apenas em server modules/route handlers.

### 2.2 Banco de dados (MySQL/Postgres)
```env
DATABASE_URL="mysql://user:pass@host:3306/nb_store"
```

### 2.3 PagSeguro
```env
PAGSEGURO_ENV=sandbox
PAGSEGURO_TOKEN=********
PAGSEGURO_CLIENT_ID=********
PAGSEGURO_CLIENT_SECRET=********
PAGSEGURO_WEBHOOK_SECRET=********
PAGSEGURO_WEBHOOK_URL=https://nobugs.com.br/api/webhooks/pagseguro
```

### 2.4 Correios (API direta)
```env
CORREIOS_ENV=production
CORREIOS_USER=********
CORREIOS_PASSWORD=********
CORREIOS_ORIGIN_ZIP=00000000
```

### 2.5 Discord (OAuth + gating)
```env
DISCORD_CLIENT_ID=********
DISCORD_CLIENT_SECRET=********
DISCORD_REDIRECT_URI=https://nobugs.com.br/api/auth/callback/discord
DISCORD_GUILD_ID=********
```

### 2.6 FX (câmbio BRL->USD)
```env
FX_PROVIDER=exchangerate_api
FX_API_KEY=********
FX_BASE_CURRENCY=BRL
FX_QUOTE_CURRENCY=USD
```

### 2.7 Storage / Filesystem (S3/R2)
```env
STORAGE_ENDPOINT=https://s3.r2.cloudflarestorage.com
STORAGE_REGION=auto
STORAGE_BUCKET_PRIVATE=digital-assets
STORAGE_BUCKET_PUBLIC=public-assets
STORAGE_ACCESS_KEY=********
STORAGE_SECRET_KEY=********
STORAGE_SIGNED_URL_TTL_SECONDS=300
```
**Observações**
- Para buckets privados, mantenha ACL restritiva e gere URLs assinadas curtas (5 min ou menos).
- Para uploads públicos (imagens), considere bucket separado ou prefixo distinto.

### 2.8 Email
```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=********
EMAIL_FROM=contato@nobugs.com.br
```

### 2.9 Segurança / Throttling (recomendado)
```env
LOGIN_THROTTLE_MAX_ATTEMPTS=5
LOGIN_THROTTLE_DECAY_SECONDS=300
DOWNLOAD_THROTTLE_MAX_PER_MINUTE=30
WEBHOOK_THROTTLE_MAX_PER_MINUTE=120
```

---

## 3) `.env.example` (recomendação)
- Incluir todas as chaves, sem secrets.
- Documentar valores esperados e exemplos.

---

## 4) Sessões separadas (Loja vs Admin) — recomendações práticas
- Usar cookie names distintos (`nb_store_session`, `nb_admin_session`).
- Middleware pode setar cookie name baseado em host.
- `NEXTAUTH_URL` deve refletir o host atual em dev/prod.

---

## 5) Cron e Jobs (Vercel)

### 5.1 Cron: FX diário
- Agendar `GET /api/cron/fetch-fx` diariamente (03:00 BRT).

### 5.2 Cron: limpeza/housekeeping
- Opcional: expiração de downloads/logs.

### 5.3 Queue
- Para tarefas recorrentes/longas, usar Redis + BullMQ ou serviço equivalente.

---

## 6) Configuração de webhooks (PagSeguro)
- Endpoint: `POST /api/webhooks/pagseguro`
- Requisitos: validar assinatura, idempotência, logs sanitizados.

---

## 7) Configuração de Discord OAuth
- Redirect: `https://nobugs.com.br/api/auth/callback/discord`
- Scopes recomendados: `identify`, `guilds`, e o necessário para checar role.

---

## 8) Configuração de FX (câmbio)
- Job diário `fetch-exchange-rate` grava em `exchange_rates`.
- Pedido salva `fx_rate_used` no momento do checkout.

---

## 9) Configuração de cupons
- Cupom por produto/categoria; não afeta frete.
- Persistir rateio por item em snapshot do pedido.

---

## 10) Observabilidade / Logs
- `LOG_LEVEL=info` por padrão.
- Evitar logs no client; logs server apenas, sem secrets.

---

## 11) Checklist rápido de “pronto para produção”
- [ ] Repo conectado à Vercel com envs configurados
- [ ] Cron configurado para FX diário
- [ ] Webhook PagSeguro registrado e testado
- [ ] Storage privado funcionando com signed URLs
- [ ] Downloads protegidos e logados
- [ ] Rate limiting aplicado (login/webhook/download)
- [ ] Backups do DB configurados

---

## 12) Exemplo consolidado de `.env.local` (trecho)
Use estes nomes como referência para Vercel/preview. Não comitar secrets.

```env
NEXTAUTH_URL=https://localhost:3000
NEXTAUTH_SECRET=replace_me
auth_cookie_name=nb_store_session
admin_auth_cookie_name=nb_admin_session

DATABASE_URL=mysql://user:pass@host:3306/nb_store

PAGSEGURO_ENV=sandbox
PAGSEGURO_TOKEN=token
PAGSEGURO_CLIENT_ID=client_id
PAGSEGURO_CLIENT_SECRET=client_secret
PAGSEGURO_WEBHOOK_SECRET=webhook_secret
PAGSEGURO_WEBHOOK_URL=https://localhost:3000/api/webhooks/pagseguro

DISCORD_CLIENT_ID=discord_id
DISCORD_CLIENT_SECRET=discord_secret
DISCORD_REDIRECT_URI=https://localhost:3000/api/auth/callback/discord
DISCORD_GUILD_ID=guild_id

STORAGE_ENDPOINT=https://s3.r2.cloudflarestorage.com
STORAGE_REGION=auto
STORAGE_BUCKET_PRIVATE=digital-assets
STORAGE_BUCKET_PUBLIC=public-assets
STORAGE_ACCESS_KEY=access_key
STORAGE_SECRET_KEY=secret_key
STORAGE_SIGNED_URL_TTL_SECONDS=300

FX_PROVIDER=exchangerate_api
FX_API_KEY=fx_key
FX_BASE_CURRENCY=BRL
FX_QUOTE_CURRENCY=USD

EMAIL_PROVIDER=resend
RESEND_API_KEY=resend_key
EMAIL_FROM=contato@nobugs.com.br
```
