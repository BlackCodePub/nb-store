# nb-store — Configuração (MVP)

Data: **2025-12-16**  
Repo: **BlackCodePub/nb-store**  
Stack: **Laravel 11 + Blade + Bootstrap + MySQL**  
Hospedagem: **Hostinger Shared** (deploy FTP)  
Queue: **database** (worker via cron)  
SMTP: **Hostinger**

Este documento lista todas as configurações necessárias (local/dev e produção) para rodar o projeto com o escopo e decisões do MVP.

---

## 1) Ambientes e domínios

### Produção
- Loja: `https://nobugs.com.br`
- Admin: `https://admin.nobugs.com.br`
- (Opcional) API: `https://api.nobugs.com.br`

### Desenvolvimento
- Loja: `https://localhost`
- Admin: `https://admin.localhost`
- (Opcional) API: `https://api.localhost`

**Decisão:** Loja e Admin usam **sessões separadas**.

---

## 2) `.env` — Variáveis obrigatórias (MVP)

Abaixo está o conjunto recomendado de variáveis. Adapte conforme seu provedor.

### 2.1 App
```env
APP_NAME="nb-store"
APP_ENV=local
APP_KEY=base64:...
APP_DEBUG=true
APP_URL=http://localhost
APP_TIMEZONE=America/Sao_Paulo

# Idioma default + fallback
APP_LOCALE=pt_BR
APP_FALLBACK_LOCALE=en_US
```

### 2.2 URLs por contexto (sugestão)
Como a loja e o admin são subdomínios diferentes, é comum precisar de URLs explícitas:

```env
STORE_URL=https://nobugs.com.br
ADMIN_URL=https://admin.nobugs.com.br
```

Em dev:
```env
STORE_URL=http://localhost
ADMIN_URL=http://admin.localhost
```

> Observação: `APP_URL` pode apontar para a loja; use `STORE_URL/ADMIN_URL` para gerar links consistentes entre subdomínios.

### 2.3 Banco de dados (MySQL)
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=nb_store
DB_USERNAME=root
DB_PASSWORD=
```

### 2.4 Sessão (separada por subdomínio)
Recomendação MVP: **não** compartilhar sessão entre subdomínios.

```env
SESSION_DRIVER=file
SESSION_LIFETIME=120
SESSION_ENCRYPT=true

# IMPORTANTE: deixar vazio (ou apontar apenas para o host atual)
# para evitar compartilhar cookies entre nobugs.com.br e admin.nobugs.com.br
SESSION_DOMAIN=
```

> Em produção, para a loja: cookie no domínio da loja; para o admin: cookie no domínio do admin.  
> Se você usar o mesmo deploy para ambos, garanta que o cookie name não conflita (ver seção 4).

### 2.5 Cache (simples no MVP)
```env
CACHE_STORE=file
```

### 2.6 Queue (database)
```env
QUEUE_CONNECTION=database
```

### 2.7 Mail (SMTP Hostinger)
Exemplo (ajuste com os dados reais):
```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=587
MAIL_USERNAME=contato@nobugs.com.br
MAIL_PASSWORD=********
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=contato@nobugs.com.br
MAIL_FROM_NAME="NoBugs Store"
```

### 2.8 Storage / Filesystem
```env
FILESYSTEM_DISK=local
```

Para imagens públicas:
- usar `public` disk (Laravel) e `php artisan storage:link`

### 2.9 PagSeguro
> Os nomes exatos das variáveis dependem da SDK/integração escolhida. Defina um padrão consistente.

```env
PAGSEGURO_ENV=sandbox
PAGSEGURO_TOKEN=********
PAGSEGURO_CLIENT_ID=********
PAGSEGURO_CLIENT_SECRET=********
PAGSEGURO_WEBHOOK_SECRET=********
PAGSEGURO_WEBHOOK_URL=https://nobugs.com.br/webhooks/pagseguro
```

Produção:
```env
PAGSEGURO_ENV=production
```

**Decisão:** parcelamento habilitado; **juros pagos pelo cliente**.

### 2.10 Correios (API direta)
Dependendo do endpoint usado, pode haver credenciais/contrato.

```env
CORREIOS_ENV=production
CORREIOS_USER=********
CORREIOS_PASSWORD=********
CORREIOS_ORIGIN_ZIP=00000000
```

Se a API usada for pública sem auth, mantenha apenas:
```env
CORREIOS_ORIGIN_ZIP=00000000
```

### 2.11 Discord (OAuth + gating)
```env
DISCORD_CLIENT_ID=********
DISCORD_CLIENT_SECRET=********
DISCORD_REDIRECT_URI=https://nobugs.com.br/auth/discord/callback

# Guild principal (se for uma só)
DISCORD_GUILD_ID=********
```

> Para gating por produto/categoria, o `guild_id` pode ficar por regra no banco (recomendado). Mesmo assim, manter um default no env ajuda.

### 2.12 FX (câmbio BRL->USD)
```env
FX_PROVIDER=exchangerate_api
FX_API_KEY=********

FX_BASE_CURRENCY=BRL
FX_QUOTE_CURRENCY=USD
FX_REFRESH_CRON=daily
```

**Decisão:** BRL é base; USD é conversão diária (cron + tabela de rates).

### 2.13 Segurança / Throttling (recomendado)
```env
LOGIN_THROTTLE_MAX_ATTEMPTS=5
LOGIN_THROTTLE_DECAY_MINUTES=5

DOWNLOAD_THROTTLE_MAX_PER_MINUTE=30
WEBHOOK_THROTTLE_MAX_PER_MINUTE=120
```

---

## 3) `.env.example` (recomendação)
Mantenha um `.env.example` com **todas as chaves**, sem secrets.

Checklist:
- incluir `STORE_URL`, `ADMIN_URL`
- incluir `PAGSEGURO_*`, `DISCORD_*`, `CORREIOS_*`, `FX_*`
- documentar valores esperados

---

## 4) Sessões separadas (Loja vs Admin) — recomendações práticas

Como o Laravel normalmente usa o mesmo cookie name (`laravel_session`), em apps no mesmo domínio isso pode conflitar. Para subdomínios separados, costuma ser ok, mas ainda é recomendável padronizar.

### 4.1 Names de sessão
Sugestão: configurar nomes diferentes por contexto (loja/admin) usando env + config:

```env
SESSION_COOKIE=nb_store_session
ADMIN_SESSION_COOKIE=nb_admin_session
```

Então, no código, quando o request estiver em `admin.*`, sobrescrever o cookie name.

**Sugestão de arquivos/pontos para implementar:**
- `config/session.php`
- middleware `app/Http/Middleware/SetSessionCookieName.php` (custom)

### 4.2 `SESSION_DOMAIN`
- **MVP recomendado:** `SESSION_DOMAIN=` (vazio)
- Evitar `.nobugs.com.br` (isso compartilharia sessão entre loja/admin)

---

## 5) Cron e Queue (Hostinger Shared)

### 5.1 Cron: Scheduler
Rodar a cada minuto:
```bash
* * * * * php /path/to/artisan schedule:run >> /dev/null 2>&1
```

### 5.2 Cron: Queue Worker (database)
Sem daemon, rodar:
```bash
* * * * * php /path/to/artisan queue:work --stop-when-empty >> /dev/null 2>&1
```

### 5.3 Logs em produção
Garanta que `storage/logs/` tem permissão de escrita.

---

## 6) Deploy (FTP) — checklist mínimo

1. Subir código (idealmente com `vendor/` preparado, se não houver composer no host)
2. Subir `.env` de produção
3. Garantir permissões:
   - `storage/` e `bootstrap/cache/` graváveis
4. Rodar migrations:
   - `php artisan migrate --force`
5. Gerar caches:
   - `php artisan config:cache`
   - `php artisan route:cache`
6. Criar symlink:
   - `php artisan storage:link`

> Se não houver CLI/SSH, documentar processo alternativo (ex.: subir assets compilados, subir `storage` links manualmente, etc.).

---

## 7) Configuração de webhooks (PagSeguro)

### 7.1 Endpoint
- `POST https://nobugs.com.br/webhooks/pagseguro`

### 7.2 Requisitos
- Validar assinatura (se disponível)
- Logar payload (com cuidado para não expor dados sensíveis)
- Implementar idempotência por `provider_reference`

### 7.3 Variáveis
- `PAGSEGURO_WEBHOOK_SECRET`
- `PAGSEGURO_WEBHOOK_URL`

---

## 8) Configuração de Discord OAuth

### 8.1 Redirect URI
No Discord Developer Portal:
- `https://nobugs.com.br/auth/discord/callback`

Em dev:
- `http://localhost/auth/discord/callback`

### 8.2 Scopes recomendados (MVP)
- `identify`
- `guilds` (para checar membership)
- (dependendo do método) `guilds.members.read`

> A checagem de role pode exigir endpoints específicos e permissões adequadas.

---

## 9) Configuração de FX (câmbio)
### 9.1 Tarefa diária
- Job `FetchExchangeRateJob` agendado diariamente (ex.: 03:00 BRT)

### 9.2 Persistência
- tabela `exchange_rates` com `rate` e `fetched_at`

### 9.3 Uso no pedido
- salvar `fx_rate_used` no `orders` ao criar pedido (consistência)

---

## 10) Configuração de cupons
**Decisão MVP:**
- cupom por produto/categoria (escopo)
- cupom **não** afeta frete
- descontos rateados e salvos no snapshot do `order_items`

Variáveis opcionais:
```env
COUPON_CODE_MAX_LENGTH=32
COUPON_DEFAULT_MIN_SUBTOTAL_BRL_CENTS=0
```

---

## 11) Observabilidade / Logs
Recomendação de env:
```env
LOG_CHANNEL=stack
LOG_LEVEL=info
```

Para debug controlado:
```env
LOG_LEVEL=debug
APP_DEBUG=false
```

**Atenção:** nunca logar tokens e secrets em texto puro (PagSeguro/Discord).

---

## 12) Checklist rápido de “pronto para produção”
- [ ] Repo público/privado conforme estratégia
- [ ] `.env` configurado com todos os providers
- [ ] Cron `schedule:run` ativo
- [ ] Worker queue ativo e testado (`database` queue)
- [ ] Webhook PagSeguro registrado e testado
- [ ] Câmbio diário funcionando
- [ ] Upload de imagens funcionando (`storage:link`)
- [ ] Download digital protegido e com logs
- [ ] Rate limiting aplicado (login/webhook/download)
- [ ] Backups do MySQL definidos (Hostinger)

---

## 13) Referências (paths sugeridos)
- Config base:
  - `config/app.php`, `config/session.php`, `config/cache.php`, `config/queue.php`, `config/mail.php`
- Middlewares:
  - `app/Http/Middleware/SetLocale.php`
  - `app/Http/Middleware/SetCurrency.php`
  - `app/Http/Middleware/SetSessionCookieName.php` *(custom, se necessário)*
- Scheduler:
  - `app/Console/Kernel.php`
- Webhook:
  - `routes/web.php`
  - `app/Http/Controllers/Webhooks/PagSeguroWebhookController.php`
- Services:
  - `app/Services/Payments/*`
  - `app/Services/Shipping/*`
  - `app/Services/Discord/*`
  - `app/Services/FX/*`

Copilot is powered by AI, so mistakes are possible. Leave a comment via the 👍 👎 to share your feedback and help improve the experience.