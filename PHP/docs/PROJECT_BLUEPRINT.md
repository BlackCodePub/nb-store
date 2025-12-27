# nb-store — Documentação Completa do Projeto (MVP)

Data: **2025-12-16**  
Repo: **BlackCodePub/nb-store**  
Domínios:
- Produção (Loja): https://nobugs.com.br  
- Produção (Admin): https://admin.nobugs.com.br  
- Produção (API opcional): https://api.nobugs.com.br  
- Dev (Loja): https://localhost  
- Dev (Admin): https://admin.localhost  
- Dev (API opcional): https://api.localhost  

---

## 1) Objetivo do produto
Plataforma de e-commerce (tema fixo) para venda de **produtos físicos** e **produtos digitais** (arquivos, links e licenças), com:
- Checkout multi-etapas
- Frete via Correios (API direta)
- Pagamentos via PagSeguro (com parcelamento)
- Entrega digital segura (links assinados, limites e expiração)
- Gating por Discord (guild + role) por produto/categoria
- Blog com comentários moderados
- LGPD (consentimento cookies, exportação e exclusão de dados)
- Multi-idioma (pt-BR/en-US)
- Multi-moeda (BRL base + USD convertido por câmbio diário)
- Cupons com restrição por produto/categoria (não afeta frete)

---

## 2) Decisões já tomadas (congeladas)
### Stack
- **Laravel 11**
- Blade + Bootstrap (tema fixo)
- Hospedagem: **Hostinger Shared** (deploy por FTP)
- SMTP: **Hostinger**
- Queue: **database**
- Arquivos digitais: **local** em `storage/app` (sem S3 no MVP)
- Checkout: multi-etapas
- Sem guest checkout (**usuário precisa estar logado**)

### Domínios e sessão
- Loja e Admin em subdomínios diferentes
- **Sessões separadas** (logins não são compartilhados entre `nobugs.com.br` e `admin.nobugs.com.br`)

### Estoque
- Pedido `pending` **não reserva estoque**
- Baixa estoque apenas quando `paid`

### Cupons
- Cupom pode ser:
  - global (tudo)
  - restrito por **categoria**
  - restrito por **produto**
- **Cupom não desconta frete**
- Carrinho misto: desconto aplica apenas a itens elegíveis

### PagSeguro / Parcelamento
- Parcelamento habilitado
- **Cliente paga juros** do parcelamento (total varia conforme parcelas)

---

## 3) Arquitetura: apps, rotas e organização
### 3.1 Apps
- **Loja** (web): `nobugs.com.br`
- **Admin** (web): `admin.nobugs.com.br`
- **API** (opcional): `api.nobugs.com.br` (evitar no MVP; usar web/Blade)

### 3.2 Estrutura recomendada do Laravel
> Observação: como tudo está em um único projeto Laravel, a separação é por rotas, middleware, controllers e views.

**Pastas sugeridas**
- `routes/web.php` (Loja)
- `routes/admin.php` (Admin) — registrar no `RouteServiceProvider`
- `app/Http/Controllers/Store/*`
- `app/Http/Controllers/Admin/*`
- `app/Http/Middleware/*` (locale, currency, admin auth)
- `resources/views/store/*`
- `resources/views/admin/*`
- `app/Models/*`
- `app/Services/*` (PagSeguro, Correios, Discord, FX, Coupons)
- `app/Policies/*` (RBAC + níveis + invisibilidade)
- `app/Jobs/*` (FX fetch, export LGPD, e-mails, etc.)
- `database/migrations/*`
- `database/seeders/*`

### 3.3 Middlewares essenciais
- `SetLocale` (auto por navegador/IP + seletor + persistência)
- `SetCurrency` (BRL/USD por preferência; default BRL)
- `EnsureEmailVerified` (para comprar/baixar)
- `EnsureAdmin` + RBAC policies (admin)

---

## 4) Regras de negócio (alto nível)
### 4.1 Usuário e conta
- Usuário precisa criar conta para comprar
- Suporta Social Login (Discord primeiro, outros plugáveis)
- Preferências:
  - idioma (pt-BR/en-US)
  - moeda (BRL/USD)

### 4.2 Produtos
Tipos:
- **Physical**
- **Digital** (arquivo/local, link externo, ou licença/serial)

Variações:
- Produto pode ter **variantes** (ex.: tamanho/cor/licença)
- Carrinho e pedido devem gravar snapshot do preço/nome

### 4.3 Checkout multi-etapas
Etapas sugeridas:
1. Endereço
2. Frete (Correios)
3. Pagamento (PagSeguro) + parcelamento
4. Revisão / criação do pedido (`pending`)

### 4.4 Estados de pedido (sugestão MVP)
- `draft` (opcional, interno)
- `pending` (aguardando pagamento)
- `paid`
- `canceled`
- `refunded` (se for suportar)
- `failed` (erro de pagamento)

### 4.5 Frete
- Cotação e seleção via Correios
- Frete não sofre desconto de cupom (Decisão 31A)

### 4.6 Pagamentos (PagSeguro)
- Criar cobrança/checkout para o pedido
- Receber webhooks e atualizar estado do pedido
- Idempotência: reprocessar webhook sem duplicar pagamentos/itens

### 4.7 Entrega digital
- Ao confirmar pagamento, criar “entitlements” (direitos) por item digital
- Download protegido por:
  - autenticação
  - checagem de `expires_at` (se existir)
  - limite de downloads
  - logs (IP, user-agent)
  - URLs assinadas (signed routes)

### 4.8 Discord gating
- Regras por **produto** e/ou **categoria**
- Checar:
  - no checkout (bloquear compra se não atende)
  - no download (bloquear acesso mesmo se comprou mas não atende — regra a confirmar; recomendado bloquear também no download para consistência)
- Exigir:
  - usuário conectou conta Discord
  - membro da guild
  - possui role necessária

### 4.9 Blog + Comentários
- Posts com tradução (pt/en)
- Comentários:
  - status `pending/approved/rejected`
  - moderação no admin

### 4.10 LGPD
- Consentimento cookies
- Exportação de dados do usuário (job)
- Exclusão de conta:
  - soft-delete
  - anonimização do que for necessário para manter integridade contábil/pedidos (definir política)

---

## 5) Modelo de dados (tabelas sugeridas)
> Núcleo mínimo para o MVP.

### 5.1 Auth
**users**
- id
- name
- email (unique)
- email_verified_at
- password
- locale (nullable; `pt_BR` / `en_US`)
- currency (nullable; `BRL` / `USD`)
- created_at, updated_at

**social_accounts**
- id
- user_id (FK users)
- provider (`discord`, etc.)
- provider_user_id
- access_token (encrypted)
- refresh_token (encrypted, nullable)
- expires_at (nullable)
- created_at, updated_at

### 5.2 RBAC
**roles**
- id
- name
- level (int)
- is_admin (bool)

**permissions**
- id
- key (ex.: `products.manage`)
- description

**role_permission** (pivot)
- role_id
- permission_id

**user_role** (pivot)
- user_id
- role_id

### 5.3 Catálogo
**categories**
- id
- parent_id (nullable)
- slug (unique)
- is_active (bool)
- created_at, updated_at

**category_translations**
- id
- category_id
- locale
- name
- description (nullable)

**products**
- id
- type (`physical`/`digital`)
- sku (nullable)
- is_active (bool)
- price_brl_cents (base) *(se preço por variante, manter como default)*
- created_at, updated_at

**product_translations**
- id
- product_id
- locale
- name
- description
- seo_title (nullable)
- seo_description (nullable)

**product_images**
- id
- product_id
- path
- sort (int)

### 5.4 Variações
**product_variants**
- id
- product_id
- sku (nullable)
- name (ex.: “Licença Pro”, “Tamanho M”)
- price_brl_cents
- stock_qty (nullable para digital)
- is_active (bool)

### 5.5 Carrinho
**carts**
- id
- user_id

**cart_items**
- id
- cart_id
- product_id
- variant_id (nullable)
- qty
- unit_price_brl_cents_snapshot
- name_snapshot

### 5.6 Cupons
**coupons**
- id
- code (unique)
- type (`percent`/`fixed`)
- value (int; percent 1–100 ou fixed em cents)
- starts_at (nullable)
- ends_at (nullable)
- max_uses_total (nullable)
- max_uses_per_user (nullable)
- min_subtotal_brl_cents (nullable)
- is_active (bool)

**coupon_redemptions**
- id
- coupon_id
- user_id
- order_id (nullable enquanto em “applied”; ou criar só ao pagar)
- created_at

**coupon_products**
- coupon_id
- product_id

**coupon_categories**
- coupon_id
- category_id

### 5.7 Pedido e entrega
**orders**
- id
- user_id
- status
- currency (BRL/USD) *(moeda exibida ao cliente)*
- fx_rate_used (nullable; BRL->USD usado)
- subtotal_brl_cents
- discount_brl_cents
- shipping_brl_cents
- total_brl_cents
- subtotal_usd_cents (nullable)
- discount_usd_cents (nullable)
- shipping_usd_cents (nullable)
- total_usd_cents (nullable)
- created_at, updated_at

**order_items**
- id
- order_id
- product_id
- variant_id (nullable)
- qty
- type_snapshot (`physical`/`digital`)
- unit_price_brl_cents_snapshot
- discount_brl_cents_snapshot
- name_snapshot

**order_addresses**
- id
- order_id
- name
- document (cpf/cnpj opcional)
- postal_code
- street
- number
- complement
- district
- city
- state
- country

**order_shipments**
- id
- order_id
- carrier (`correios`)
- service_code
- service_name (cache)
- price_brl_cents
- deadline_days (nullable)
- tracking_code (nullable)
- status (nullable)

### 5.8 Pagamentos
**payments**
- id
- order_id
- provider (`pagseguro`)
- provider_reference
- status
- paid_at (nullable)
- payload_json (json)
- created_at, updated_at

### 5.9 Digital delivery
**digital_assets**
- id
- product_id
- variant_id (nullable; se asset varia por variante)
- kind (`file`/`link`/`license`)
- file_path (nullable)
- external_url (nullable)
- meta_json (nullable) *(ex.: pool de licenças, instruções)*
- created_at, updated_at

**digital_entitlements**
- id
- order_item_id
- user_id
- expires_at (nullable)
- max_downloads (default 3)
- downloads_count (default 0)

**digital_download_logs**
- id
- entitlement_id
- user_id
- ip
- user_agent
- created_at

### 5.10 Discord gating
**discord_rules**
- id
- ruleable_type (`product`/`category`)
- ruleable_id
- guild_id
- required_role_id
- required_role_name_cache (nullable)
- created_at, updated_at

### 5.11 Câmbio
**exchange_rates**
- id
- base_currency (BRL)
- quote_currency (USD)
- rate
- provider
- fetched_at

### 5.12 Blog
**posts**
- id
- slug
- status (`draft`/`published`)
- published_at (nullable)
- created_at, updated_at

**post_translations**
- id
- post_id
- locale
- title
- content
- seo_title (nullable)
- seo_description (nullable)

**comments**
- id
- post_id
- user_id
- body
- status (`pending`/`approved`/`rejected`)
- created_at, updated_at

### 5.13 LGPD
**cookie_consents**
- id
- user_id (nullable)
- consent_version
- analytics (bool)
- marketing (bool)
- created_at

**data_export_requests**
- id
- user_id
- status
- file_path (nullable)
- created_at, updated_at

**data_deletion_requests**
- id
- user_id
- status
- created_at, updated_at

---

## 6) Serviços e integrações (design técnico)
### 6.1 Correios (API direta)
**Service class sugerida**
- `app/Services/Shipping/CorreiosClient.php`
- `app/Services/Shipping/ShippingQuoteService.php`

**Responsabilidades**
- calcular preço/prazo por CEP e dimensões/peso
- normalizar resposta
- mapear serviços (PAC/SEDEX etc.)

### 6.2 PagSeguro
**Service class sugerida**
- `app/Services/Payments/PagSeguroClient.php`
- `app/Services/Payments/PagSeguroWebhookHandler.php`
- `app/Actions/Orders/MarkOrderPaid.php` (ou service)

**Rotas**
- `POST /webhooks/pagseguro` (com validação de assinatura se disponível)

### 6.3 Discord
**Service class sugerida**
- `app/Services/Discord/DiscordClient.php`
- `app/Services/Discord/DiscordGateService.php`

**Checagens**
- possui conta discord conectada
- é membro da guild
- possui role

### 6.4 FX (câmbio BRL->USD)
- `app/Services/FX/ExchangeRateService.php`
- `app/Jobs/FetchExchangeRateJob.php`
- schedule diário via `app/Console/Kernel.php`

---

## 7) Views/Páginas (MVP)
### Loja
- Home
- Categoria (listagem)
- Produto (detalhe + seleção de variante)
- Carrinho
- Checkout:
  - endereço
  - frete
  - pagamento
  - revisão
- Minha Conta:
  - perfil (locale/currency)
  - pedidos
  - downloads
  - conectar Discord

### Admin
- Login admin
- Dashboard
- Produtos
- Categorias
- Variantes
- Cupons
- Pedidos + pagamentos
- Assets digitais
- Regras Discord
- Posts
- Comentários (moderação)
- Usuários / Roles / Permissions
- FX rate + configurações gerais

---

## 8) Segurança e hardening (MVP)
- Rate limiting em:
  - login
  - reset password
  - webhooks
  - downloads
- Signed URLs para downloads
- Logs de:
  - webhooks recebidos (payload)
  - downloads digitais
  - ações administrativas sensíveis
- Validar upload:
  - tamanho máximo
  - mimetype
  - path traversal
- CSRF e validações de request

---

## 9) Hostinger Shared: deploy + cron + queue
### Deploy (FTP)
Checklist sugerido:
1. Subir arquivos da aplicação
2. Rodar `composer install --no-dev` (se tiver SSH; se não, subir vendor — não recomendado; alternativa: pipeline local)
3. Configurar `.env` em produção
4. Rodar migrations: `php artisan migrate --force`
5. Rodar cache:
   - `php artisan config:cache`
   - `php artisan route:cache`
6. Garantir permissões de `storage/` e `bootstrap/cache`

### Cron
- `* * * * * php /path/to/artisan schedule:run >> /dev/null 2>&1`
- Worker:
  - se não houver daemon, usar cron a cada minuto:
    - `* * * * * php /path/to/artisan queue:work --stop-when-empty >> /dev/null 2>&1`

---

## 10) Backlog do MVP (por sprints de 1 semana) — visão macro
> Esta seção é um guia; pode ser convertida em Issues depois.

### Sprint 1
- Setup Laravel 11 + envs + DB
- Layouts base loja/admin
- Auth base
- Queue/cron docs
- UI kits iniciais (design)

### Sprint 2
- RBAC + níveis + policies admin
- Catálogo base (produtos/categorias + translations)
- Locale selector (pt/en) + persistência
- Loja: listagem básica

### Sprint 3
- Variações + estoque + imagens
- Loja: página de produto com variante

### Sprint 4
- Carrinho
- Cupons (restrição por produto/categoria; sem frete)
- Checkout Step 1–2 (endereço/frete skeleton)

### Sprint 5
- Correios integração completa
- Orders / admin pedidos
- Checkout cria pedido pending

### Sprint 6
- PagSeguro + webhooks + e-mails transacionais
- Status paid

### Sprint 7
- Digital delivery (assets/entitlements/downloads/logs)
- Discord gating (checkout + download)
- Minha conta: downloads

### Sprint 8
- Blog + comentários moderação
- LGPD (consentimento, export, delete)
- Hardening + go-live checklist

---

## 11) Referências de código (paths sugeridos por feature)
### Autenticação
- `routes/web.php`
- `app/Http/Controllers/Auth/*`
- `resources/views/auth/*`
- `app/Models/User.php`

### Admin separação
- `routes/admin.php`
- `app/Http/Controllers/Admin/*`
- `resources/views/admin/*`
- `app/Http/Middleware/EnsureAdmin.php`

### RBAC
- `app/Models/Role.php`, `Permission.php`
- `app/Policies/*`
- `database/migrations/*roles*`, `*permissions*`

### Catálogo + translations
- `app/Models/Product.php`, `Category.php`, `ProductVariant.php`
- `resources/views/store/catalog/*`
- `app/Http/Controllers/Admin/ProductsController.php` (ou equivalente)

### Cupons
- `app/Models/Coupon.php`
- `app/Services/Pricing/CouponService.php`
- `app/Services/Pricing/CartPricingService.php`

### Checkout/Orders
- `app/Http/Controllers/Store/Checkout/*`
- `app/Models/Order.php`
- `app/Actions/Orders/*`

### Correios
- `app/Services/Shipping/*`

### PagSeguro
- `app/Services/Payments/*`
- `routes/web.php` (webhook)
- `app/Http/Controllers/Webhooks/PagSeguroWebhookController.php`

### Digital
- `app/Models/DigitalAsset.php`, `DigitalEntitlement.php`
- `app/Http/Controllers/Store/DownloadsController.php`

### Discord gating
- `app/Services/Discord/*`
- `app/Policies/DownloadPolicy.php` (exemplo)
- `app/Http/Middleware/*` (opcional)

### Blog/Comentários
- `app/Models/Post.php`, `Comment.php`
- `app/Http/Controllers/Admin/PostsController.php`
- `resources/views/store/blog/*`

### LGPD
- `app/Http/Controllers/Store/Privacy/*`
- `app/Jobs/ExportUserDataJob.php`
- `app/Jobs/DeleteUserDataJob.php`

---

## 12) Próximas decisões (se quiser evoluir pós-MVP)
- Reservar estoque em `pending` com expiração
- Integração de impressão/nota fiscal
- S3/Cloud storage
- CI/CD e deploy zero-downtime
- Busca avançada (Meilisearch/Algolia)
- Coupons por variante / regras combinadas
- Recuperação automática de pagamento / chargeback flows

---

## 13) Como usar este documento
- Este arquivo serve como “contrato” do MVP.
- Se mudar uma decisão (ex.: guest checkout), atualize a seção **Decisões**.
- Para transformar em issues: copiar a seção “Backlog por sprints” e dividir conforme features.
