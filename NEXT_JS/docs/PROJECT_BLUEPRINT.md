# nb-store — Documentação Completa do Projeto (MVP, Next.js)

Data: **2025-12-18**  
Repo: **BlackCodePub/nb-store (variant Next.js)**  
Domínios:
- Produção (Loja): https://nobugs.com.br  
- Produção (Admin): https://admin.nobugs.com.br  
- Produção (API opcional): https://api.nobugs.com.br  
- Dev (Loja): http://localhost:3000  
- Dev (Admin): http://admin.localhost:3000  
- Dev (API opcional): http://api.localhost:3000  

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
- **Next.js 14 (App Router) + TypeScript**
- Bootstrap 5 (tema fixo, Sass)
- Prisma + MySQL/Postgres
- Auth: NextAuth (credentials + Discord OAuth)
- Hospedagem: **Vercel** (route handlers, cron)
- Storage: **S3/R2 privado** para digitais; bucket público para imagens
- Checkout: multi-etapas
- Sem guest checkout (**usuário precisa estar logado**)

### Domínios e sessão
- Loja e Admin em subdomínios diferentes
- **Sessões separadas** (cookies isolados por host)

### Estoque
- Pedido `pending` **não reserva estoque**
- Baixa estoque apenas quando `paid`

### Cupons
- Cupom pode ser global, por **categoria** ou por **produto**
- **Cupom não desconta frete**
- Carrinho misto: desconto aplica apenas a itens elegíveis

### PagSeguro / Parcelamento
- Parcelamento habilitado
- **Cliente paga juros** do parcelamento (total varia conforme parcelas)

---

## 3) Arquitetura: apps, rotas e organização (Next.js)
### 3.1 Segmentos App Router
- **Loja**: `app/(store)/*`
- **Admin**: `app/(admin)/*`
- **API**: `app/api/*` (route handlers para webhooks, auth callbacks, endpoints internos)

### 3.2 Pastas sugeridas
- `src/server/*` — serviços de domínio (payments, shipping, pricing, discord, fx, digital)
- `src/server/validation/*` — zod schemas
- `src/server/auth/*` — NextAuth config, RBAC helpers
- `src/components/*` — UI, store, admin
- `prisma/schema.prisma` — modelo de dados
- `src/jobs/*` — jobs (FX, housekeeping)

### 3.3 Middlewares essenciais
- `middleware.ts` para locale/currency e segurança básica
- Rate limit middleware (Upstash/Redis) para login/webhook/download
- Host-based guard para separar cookies loja/admin

---

## 4) Regras de negócio (alto nível)
### 4.1 Usuário e conta
- Usuário precisa criar conta para comprar (NextAuth credentials/Discord)
- Preferências: idioma (pt-BR/en-US), moeda (BRL/USD)

### 4.2 Produtos
Tipos: **Physical** e **Digital** (arquivo/link/licença)
Variações: suporte a variantes (tamanho/cor/licença)

### 4.3 Checkout multi-etapas
1. Endereço
2. Frete (Correios)
3. Pagamento (PagSeguro)
4. Revisão / criação do pedido (`pending`)

### 4.4 Estados de pedido
- `pending`, `paid`, `canceled`, `failed`, `refunded` (opcional)

### 4.5 Frete
- Cotação e seleção via Correios
- Frete não sofre desconto de cupom

### 4.6 Pagamentos (PagSeguro)
- Criar cobrança/checkout para o pedido
- Receber webhooks e atualizar estado do pedido
- Idempotência obrigatória

### 4.7 Entrega digital
- Ao confirmar pagamento, criar entitlements por item digital
- Download protegido (auth, limite, expiração, logs, URLs assinadas)

### 4.8 Discord gating
- Regras por **produto** e/ou **categoria**
- Checar no checkout e no download
- Exigir conta Discord conectada + guild/role

### 4.9 Blog + Comentários
- Posts com tradução (pt/en)
- Comentários moderados

### 4.10 LGPD
- Consentimento cookies
- Exportação de dados do usuário (job)
- Exclusão/anonimização com política definida

---

## 5) Modelo de dados (tabelas Prisma sugeridas)
### 5.1 Auth
- `User`: id, name, email, emailVerified, locale, currency, password hash
- `Account`: NextAuth provider accounts (Discord)
- `Session`: NextAuth sessions
- `VerificationToken`

### 5.2 RBAC
- `Role`: id, name, level, isAdmin
- `Permission`: id, key, description
- `RolePermission`: roleId, permissionId
- `UserRole`: userId, roleId

### 5.3 Catálogo
- `Category` (+ `CategoryTranslation`)
- `Product` (+ `ProductTranslation`)
- `ProductVariant`
- `ProductImage`

### 5.4 Carrinho
- `Cart`, `CartItem` (per user)

### 5.5 Cupons
- `Coupon`
- `CouponRedemption`
- `CouponProduct`, `CouponCategory`

### 5.6 Pedido e entrega
- `Order`
- `OrderItem`
- `OrderAddress`
- `OrderShipment`

### 5.7 Pagamentos
- `Payment`: orderId, provider, providerReference, status, paidAt, payload

### 5.8 Digital delivery
- `DigitalAsset`: product/variant, kind (file/link/license), path/url/meta
- `DigitalEntitlement`: orderItemId, userId, expiresAt, maxDownloads, downloadsCount
- `DigitalDownloadLog`: entitlementId, userId, ip, userAgent, createdAt

### 5.9 Discord gating
- `DiscordRule`: ruleable_type (`product`/`category`), ruleable_id, guild_id, required_role_id/name

### 5.10 Câmbio
- `ExchangeRate`: base_currency, quote_currency, rate, provider, fetched_at

### 5.11 Blog
- `Post`, `PostTranslation`, `Comment`

### 5.12 LGPD
- `CookieConsent`
- `DataExportRequest`
- `DataDeletionRequest`

---

## 6) Serviços e integrações (design técnico)
- **Shipping/Correios**: server module `shipping` + API client; expõe função `quoteFreight`.
- **PagSeguro**: server module `payments` + route handler `/api/webhooks/pagseguro`; Action `markOrderPaid` com idempotência.
- **Discord**: module `discord` com OAuth (NextAuth) e `DiscordGateService` para guild/role.
- **FX (câmbio)**: module `fx` + job `fetchExchangeRate` (cron) grava em `exchange_rates`.
- **Pricing**: module `pricing` com `CartPricingService`, `CouponService`, `OrderTotalCalculator`.
- **Digital**: module `digital` para entitlements, signed URLs e logs.

---

## 7) Views/Páginas (MVP)
### Loja
- Home, Categoria, Produto (variante), Carrinho
- Checkout (4 steps)
- Minha Conta (perfil, pedidos, downloads, conectar Discord)

### Admin
- Login admin
- Dashboard
- Produtos, Categorias, Variantes, Imagens
- Cupons
- Pedidos + pagamentos
- Assets digitais
- Regras Discord
- Posts e Comentários (moderação)
- Usuários / Roles / Permissions
- FX rate + configurações gerais

---

## 8) Segurança e hardening (MVP)
- Rate limit: login, reset, webhooks, downloads.
- Auth obrigatória para checkout/download.
- Admin protegido por RBAC + níveis.
- Idempotência em webhooks PagSeguro.
- Downloads: entitlement + signed URL + logs + limites.
- Uploads: validação e storage privado; nunca expor path real.

---

## 9) Deploy / Operação (Vercel)
- Env via Vercel dashboard (.env local para dev).
- `pnpm build` + `prisma generate` no postinstall.
- Cron: FX diário; housekeeping opcional.
- Webhooks: `/api/webhooks/pagseguro` com secret.
- Storage: buckets privados (digitais) e públicos (imagens) com políticas claras.

---

## 10) Backlog do MVP (por sprints de 1 semana) — visão macro
- **Sprint 1**: bootstrap do projeto Next.js, auth base, layouts Bootstrap, queue/cron docs.
- **Sprint 2**: RBAC + catálogo base + i18n selector.
- **Sprint 3**: Variações + imagens + estoque.
- **Sprint 4**: Carrinho + cupons + checkout skeleton.
- **Sprint 5**: Correios integração + criação de pedido `pending`.
- **Sprint 6**: PagSeguro + webhooks + e-mails.
- **Sprint 7**: Digital delivery + Discord gating + Minha Conta (downloads).
- **Sprint 8**: Blog + LGPD + Hardening + go-live.

---

## 11) Referências de código (paths sugeridos)
- Auth: `app/api/auth/[...nextauth]/route.ts`, `src/server/auth/*`
- Admin: `app/(admin)/*`, guards em server actions
- Catálogo: `src/server/catalog/*`, `app/(store)/catalog/*`
- Cupons/Pricing: `src/server/pricing/*`
- Checkout/Orders: `app/(store)/checkout/*`, `src/server/orders/*`
- Correios: `src/server/shipping/*`
- PagSeguro: `src/server/payments/*`, `app/api/webhooks/pagseguro/route.ts`
- Digital: `src/server/digital/*`, signed URLs
- Discord: `src/server/discord/*`
- Blog/Comentários: `src/server/content/*`, `app/(store)/blog/*`
- LGPD: `src/server/privacy/*`, `src/jobs/*`

---

## 12) Próximas decisões (pós-MVP)
- Reserva de estoque em `pending` com expiração
- Fila dedicada (Redis/BullMQ) para jobs pesados
- CI/CD com checks automatizados e preview per-branch
- Busca avançada (Meilisearch/Algolia)
- Melhoria de observabilidade (traces/metrics)

---

## 13) Como usar este documento
- Serve como “contrato” do MVP Next.js.
- Se alguma decisão mudar, atualizar a seção correspondente.
- Converter seções em issues quando necessário.
