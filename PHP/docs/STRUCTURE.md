# nb-store — Estrutura Recomendada de Arquivos (MVP)

Data: **2025-12-16**  
Projeto: **nb-store (NoBugs Store)**  
Stack: **Laravel 11 + Blade + Bootstrap + MySQL**  
Hospedagem: **Hostinger Shared (FTP)** | Queue: **database**

Este documento descreve uma **estrutura de arquivos recomendada** (pastas, nomes e organização) com base em tudo que foi discutido e decidido para o MVP:
- Loja e Admin em subdomínios com **sessões separadas**
- Checkout **multi-etapas**
- PagSeguro + webhooks idempotentes
- Correios API direta
- Digital delivery com storage local (`storage/app`) + signed routes
- Discord gating (guild + role)
- Multi-idioma pt-BR/en-US e multi-moeda BRL/USD (câmbio diário)
- Blog + comentários moderados
- LGPD (consentimento, export, delete)
- Boas práticas: controllers finos, services/actions, validação por FormRequest, código comentado
- Documentação em `docs/` (com índice)

> Observação: é uma recomendação. Você pode adaptar conforme o time, mas preserve a separação por contexto (Store/Admin/Webhooks) e os “domínios” por Services/Actions.

---

## 1) Raiz do repositório (top-level)

```
.
├── app/
├── bootstrap/
├── config/
├── database/
├── docs/
├── public/
├── resources/
├── routes/
├── storage/
├── tests/
├── artisan
├── composer.json
├── package.json
├── phpunit.xml
├── README.md
└── copilot-instructions.md
```

### Regras
- **README.md** fica na raiz (visão geral e quickstart).
- Documentação detalhada deve ficar em **`docs/`**.
- Instruções do Copilot ficam em `copilot-instructions.md`.
- Se for usar políticas públicas de segurança/contribuição, considerar:
  - `SECURITY.md`
  - `CONTRIBUTING.md`

---

## 2) Documentação (`docs/`) — padrão recomendado

```
docs/
├── README.md
├── 00-overview/
│   ├── PROJECT_BLUEPRINT.md
│   ├── ROADMAP.md
│   └── TASKS.md
├── 01-architecture/
│   ├── ARCHITECTURE.md
│   ├── DIAGRAMS.md
│   └── STRUCTURE.md
├── 02-setup/
│   ├── CONFIGURATION.md
│   ├── USAGE.md
│   ├── DEPLOYMENT.md         # sugerido (futuro)
│   └── TROUBLESHOOTING.md    # sugerido (futuro)
├── 03-security/
│   ├── SECURITY_GUIDE.md     # sugerido (futuro)
│   └── THREAT_MODEL.md       # sugerido (futuro)
└── 04-dev/
    ├── GUIDELINES.md
    ├── AGENTS.md
    └── copilot-instructions.md  # opcional: duplicar/espelhar aqui (se preferir)
```

> Convenção: pastas numeradas para manter ordem lógica e facilitar navegação.

---

## 3) Rotas (`routes/`) — separação por contexto

```
routes/
├── web.php            # Loja (Store Web)
├── admin.php          # Admin (Admin Web)
├── console.php
└── api.php            # opcional no MVP (evitar se não for necessário)
```

### Regras
- **Loja**: `routes/web.php`
- **Admin**: `routes/admin.php` (registrado no provider, com domínio/prefixo e middlewares próprios)
- **Webhooks**:
  - opção A (simples): definir em `routes/web.php` com prefixo `/webhooks`
  - opção B (organizado): criar `routes/webhooks.php` e carregar via provider

---

## 4) App (`app/`) — organização por Store/Admin + domínios

### 4.1 HTTP (Controllers, Requests, Middleware)
```
app/Http/
├── Controllers/
│   ├── Store/
│   │   ├── Account/
│   │   │   ├── ProfileController.php
│   │   │   ├── OrdersController.php
│   │   │   ├── DownloadsController.php
│   │   │   └── DiscordConnectionController.php
│   │   ├── Catalog/
│   │   │   ├── HomeController.php
│   │   │   ├── CategoryController.php
│   │   │   └── ProductController.php
│   │   ├── Cart/
│   │   │   └── CartController.php
│   │   └── Checkout/
│   │       ├── AddressStepController.php
│   │       ├── ShippingStepController.php
│   │       ├── PaymentStepController.php
│   │       └── ReviewStepController.php
│   ├── Admin/
│   │   ├── Auth/
│   │   │   └── LoginController.php
│   │   ├── DashboardController.php
│   │   ├── Catalog/
│   │   │   ├── CategoriesController.php
│   │   │   ├── ProductsController.php
│   │   │   ├── ProductVariantsController.php
│   │   │   └── ProductImagesController.php
│   │   ├── Sales/
│   │   │   ├── OrdersController.php
│   │   │   └── PaymentsController.php
│   │   ├── Marketing/
│   │   │   └── CouponsController.php
│   │   ├── Digital/
│   │   │   └── DigitalAssetsController.php
│   │   ├── Discord/
│   │   │   └── DiscordRulesController.php
│   │   ├── Content/
│   │   │   ├── PostsController.php
│   │   │   └── CommentsController.php
│   │   ├── Security/
│   │   │   ├── UsersController.php
│   │   │   ├── RolesController.php
│   │   │   └── PermissionsController.php
│   │   └── Privacy/
│   │       └── DataRequestsController.php
│   └── Webhooks/
│       └── PagSeguroWebhookController.php
├── Middleware/
│   ├── EnsureAdmin.php
│   ├── SetLocale.php
│   ├── SetCurrency.php
│   └── SetSessionCookieName.php   # opcional (se precisar)
└── Requests/
    ├── Store/
    │   ├── Cart/
    │   │   └── ApplyCouponRequest.php
    │   ├── Checkout/
    │   │   ├── StoreAddressRequest.php
    │   │   └── SelectShippingRequest.php
    │   ├── Account/
    │   │   └── UpdateProfileRequest.php
    │   └── Auth/
    │       └── RegisterRequest.php
    ├── Admin/
    │   ├── Catalog/
    │   ├── Marketing/
    │   ├── Digital/
    │   ├── Content/
    │   └── Security/
    └── Webhooks/
        └── PagSeguroWebhookRequest.php
```

**Regras**
- Controllers finos.
- Validação centralizada em `Requests`.
- Middlewares para locale/currency e segurança do admin.

### 4.2 Actions (use-cases / transições críticas)
```
app/Actions/
├── Orders/
│   ├── CreatePendingOrder.php
│   ├── MarkOrderPaid.php
│   ├── CancelOrder.php               # opcional
│   ├── DecrementStock.php
│   └── GrantDigitalEntitlements.php
├── Coupons/
│   ├── ValidateCoupon.php
│   └── ApplyCouponToCart.php
└── Discord/
    └── AssertDiscordAccess.php
```

**Regras**
- Tudo que muda estado crítico (pedido/estoque/digitais) deve ficar em Action e ser facilmente testável.
- Actions devem ser idempotentes quando aplicável.

### 4.3 Services (integrações e regras complexas)
```
app/Services/
├── Payments/
│   ├── PagSeguroClient.php
│   ├── PagSeguroWebhookHandler.php
│   └── PaymentStatusMapper.php
├── Shipping/
│   ├── CorreiosClient.php
│   ├── ShippingQuoteService.php
│   └── ShippingServiceMapper.php
├── Discord/
│   ├── DiscordClient.php
│   ├── DiscordOAuthService.php
│   └── DiscordGateService.php
├── FX/
│   ├── ExchangeRateClient.php
│   └── ExchangeRateService.php
├── Pricing/
│   ├── CartPricingService.php
│   ├── CouponService.php
│   └── OrderTotalCalculator.php
├── Digital/
│   ├── DigitalDeliveryService.php
│   └── DownloadPolicyService.php
└── Security/
    ├── AuditLogger.php
    └── SensitiveDataSanitizer.php
```

**Regras**
- Services não devem depender de Request/Session diretamente (passar dados).
- Integrações externas isoladas em `*Client`.
- Log sanitizado e sem secrets.

### 4.4 Models (Eloquent)
```
app/Models/
├── User.php
├── SocialAccount.php
├── Role.php
├── Permission.php
├── Category.php
├── CategoryTranslation.php
├── Product.php
├── ProductTranslation.php
├── ProductVariant.php
├── ProductImage.php
├── Cart.php
├── CartItem.php
├── Coupon.php
├── CouponRedemption.php
├── Order.php
├── OrderItem.php
├── OrderAddress.php
├── OrderShipment.php
├── Payment.php
├── DigitalAsset.php
├── DigitalEntitlement.php
├── DigitalDownloadLog.php
├── DiscordRule.php
├── ExchangeRate.php
├── Post.php
├── PostTranslation.php
└── Comment.php
```

### 4.5 Policies
```
app/Policies/
├── Admin/
│   ├── UserPolicy.php          # inclui “níveis/invisibilidade”
│   ├── RolePolicy.php
│   ├── ProductPolicy.php
│   ├── OrderPolicy.php
│   └── CouponPolicy.php
└── Store/
    └── DownloadPolicy.php      # ownership e regras de acesso
```

### 4.6 Jobs
```
app/Jobs/
├── FetchExchangeRateJob.php
├── ExportUserDataJob.php
├── DeleteUserDataJob.php
└── SendTransactionalEmailJob.php   # opcional
```

---

## 5) Resources (Views, CSS, JS)
### 5.1 Views
```
resources/views/
├── store/
│   ├── layouts/
│   ├── components/
│   ├── catalog/
│   ├── cart/
│   ├── checkout/
│   ├── account/
│   ├── blog/
│   └── errors/
└── admin/
    ├── layouts/
    ├── components/
    ├── dashboard/
    ├── catalog/
    ├── sales/
    ├── marketing/
    ├── digital/
    ├── discord/
    ├── content/
    ├── security/
    └── errors/
```

### 5.2 Assets
```
resources/
├── css/
│   ├── app.css
│   ├── store.css      # opcional
│   └── admin.css      # opcional
└── js/
    └── app.js
```

---

## 6) Database (migrations, seeders, factories)
```
database/
├── migrations/
│   ├── 202x_xx_xx_create_roles_table.php
│   ├── 202x_xx_xx_create_permissions_table.php
│   ├── 202x_xx_xx_create_products_table.php
│   ├── 202x_xx_xx_create_product_translations_table.php
│   ├── 202x_xx_xx_create_product_variants_table.php
│   ├── 202x_xx_xx_create_coupons_table.php
│   ├── 202x_xx_xx_create_orders_table.php
│   ├── 202x_xx_xx_create_payments_table.php
│   ├── 202x_xx_xx_create_digital_assets_table.php
│   ├── 202x_xx_xx_create_digital_entitlements_table.php
│   ├── 202x_xx_xx_create_discord_rules_table.php
│   ├── 202x_xx_xx_create_exchange_rates_table.php
│   ├── 202x_xx_xx_create_posts_table.php
│   └── 202x_xx_xx_create_comments_table.php
├── seeders/
│   ├── DatabaseSeeder.php
│   ├── RolesSeeder.php
│   ├── PermissionsSeeder.php
│   └── AdminUserSeeder.php
└── factories/
    ├── UserFactory.php
    ├── ProductFactory.php
    └── OrderFactory.php   # opcional
```

**Regras**
- Índices/uniques importantes:
  - `coupons.code` unique
  - `payments.provider_reference` unique (idempotência)
- Snapshots em `order_items`

---

## 7) Public/Storage
### 7.1 Public
```
public/
├── index.php
└── storage/  # symlink para storage/app/public
```

### 7.2 Storage
```
storage/app/
├── public/                 # imagens públicas (via symlink)
└── digital/                # arquivos digitais privados (não expor via public)
    ├── products/
    └── variants/
```

**Regra crítica**
- Digitais ficam em `storage/app/digital/*` (privado) e são servidos via controller com auth+sigining.

---

## 8) Tests (mínimo recomendado)
```
tests/
├── Feature/
│   ├── Webhooks/
│   │   └── PagSeguroWebhookTest.php
│   ├── Store/
│   │   ├── CheckoutCreatesPendingOrderTest.php
│   │   └── DigitalDownloadTest.php
│   └── Admin/
│       └── RbacVisibilityTest.php
└── Unit/
    ├── Pricing/
    │   ├── CouponServiceTest.php
    │   └── OrderTotalCalculatorTest.php
    └── FX/
        └── ExchangeRateServiceTest.php
```

---

## 9) Arquivos recomendados de políticas/padrões
Na raiz:
- `copilot-instructions.md`

Em `docs/04-dev/`:
- `AGENTS.md` (regras para agentes)
- `GUIDELINES.md` (padrões do time)

---

## 10) Regras de qualidade aplicáveis à estrutura
- **Códigos e arquivos devem ser comentados** (por função e por arquivo), em pt-BR, explicando uso e guardas de segurança.
- Controllers finos; lógica em Services/Actions.
- Webhooks idempotentes (unique provider_reference + lock/transação).
- Downloads: `auth` + `signed` + throttle + logs.
- Dependências: sempre na versão mais recente estável e recomendada.

---
```