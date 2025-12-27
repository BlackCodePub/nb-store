# nb-store — Arquitetura (MVP)

Data: **2025-12-16**  
Repo: **BlackCodePub/nb-store**  
Stack: **Laravel 11 + Blade + Bootstrap + MySQL**  
Hospedagem: **Hostinger Shared (FTP)** | Queue: **database** | SMTP: **Hostinger**

---

## 1) Objetivos arquiteturais
- Entregar um MVP robusto e simples de operar em **shared hosting**.
- Separar claramente **Loja** e **Admin** (UX e segurança).
- Garantir integridade de pedidos/pagamentos com **webhooks + idempotência**.
- Entrega digital segura (URLs assinadas + logs + limites).
- Suportar evolução pós-MVP (API, storage externo, CI/CD, reservas de estoque).

---

## 2) Decisões e constraints (congeladas)
- **Laravel 11**
- Loja e Admin em subdomínios distintos com **sessões separadas**
- Checkout **multi-etapas**
- Sem guest checkout (**usuário deve estar logado**)
- Estoque: `pending` **não reserva**; baixa somente em `paid`
- PagSeguro com parcelamento; **juros pagos pelo cliente**
- Cupons restritos por produto/categoria; **não** descontam frete
- Arquivos digitais **locais** (`storage/app`) com **links assinados**
- Idiomas: **pt-BR / en-US**
- Moedas: **BRL base + USD** com câmbio por **API + cron diário**
- Discord gating por produto/categoria (guild + role)

---

## 3) Visão geral do sistema
O projeto é um **monólito Laravel** com separação lógica por rotas/middlewares:
- **Store Web (Loja)**: público + área do cliente
- **Admin Web**: área administrativa, protegida por RBAC
- **Webhooks**: endpoint(s) para PagSeguro
- **Jobs/Scheduler**: processamento assíncrono e tarefas recorrentes

O banco (MySQL) é compartilhado por Loja e Admin.

---

## 4) Topologia de deploy (Hostinger Shared)
### 4.1 Desafios típicos do shared hosting
- Sem acesso root
- Workers não rodam como daemon (precisam de cron)
- Deploy por FTP pode causar inconsistência se não houver processo de release

### 4.2 Estratégia recomendada
- Deploy por FTP seguindo checklist e janela curta
- **Queue** com `QUEUE_CONNECTION=database`
- Cron:
  - `schedule:run` a cada minuto
  - `queue:work --stop-when-empty` a cada minuto (se não houver daemon)
- Storage local:
  - `storage/app` para digitais (privado)
  - `storage/app/public` para imagens públicas (via symlink `public/storage`)

---

## 5) Separação Loja vs Admin (sessões e segurança)
### 5.1 Sessões separadas
Como a Loja e o Admin estão em subdomínios distintos, as sessões devem ser isoladas:
- Cookies/sessão diferentes para `nobugs.com.br` e `admin.nobugs.com.br`
- Não compartilhar `SESSION_DOMAIN` entre os subdomínios no MVP

### 5.2 Rotas e middlewares
- Loja:
  - `routes/web.php`
  - middleware: locale, currency, auth (para compra/download)
- Admin:
  - `routes/admin.php` (registrar no provider)
  - middleware: auth + ensureAdmin + RBAC policies

### 5.3 Estrutura de controllers e views
- Controllers:
  - `app/Http/Controllers/Store/*`
  - `app/Http/Controllers/Admin/*`
  - `app/Http/Controllers/Webhooks/*`
- Views:
  - `resources/views/store/*`
  - `resources/views/admin/*`

---

## 6) Domínios de negócio (Bounded Contexts “soft”)
> Não é DDD completo; é uma organização para manter o código sustentável.

### 6.1 Catálogo
Responsável por:
- produtos, categorias, imagens
- traduções (pt/en)
- variações (variants)
- status/visibilidade

Sugestão:
- `app/Models/Product.php`, `Category.php`, `ProductVariant.php`
- `app/Http/Controllers/Admin/Catalog/*`
- `resources/views/store/catalog/*`

### 6.2 Carrinho e Precificação
Responsável por:
- carrinho do usuário (sem guest)
- cálculo de subtotal/descontos
- aplicação de cupons restritos por produto/categoria
- conversão BRL/USD para exibição (quando aplicável)

Sugestão:
- `app/Services/Pricing/CartPricingService.php`
- `app/Services/Pricing/CouponService.php`

**Regra crítica:** Cupom **não** afeta frete.

### 6.3 Checkout & Orders
Responsável por:
- fluxo multi-etapas
- criação de pedido `pending`
- persistência de snapshots de itens e descontos
- cálculo final (itens + frete - descontos)
- moeda do pedido e FX rate aplicado

Sugestão:
- `app/Http/Controllers/Store/Checkout/*`
- `app/Models/Order.php`, `OrderItem.php`, `OrderShipment.php`

### 6.4 Payments (PagSeguro)
Responsável por:
- criar cobrança no PagSeguro
- receber webhooks e atualizar estado do pedido
- garantir idempotência e auditabilidade (payloads/logs)

Sugestão:
- `app/Services/Payments/PagSeguroClient.php`
- `app/Services/Payments/PagSeguroWebhookHandler.php`
- `app/Http/Controllers/Webhooks/PagSeguroWebhookController.php`

### 6.5 Shipping (Correios)
Responsável por:
- cotação de frete
- mapear serviços
- persistir seleção no pedido

Sugestão:
- `app/Services/Shipping/CorreiosClient.php`
- `app/Services/Shipping/ShippingQuoteService.php`

### 6.6 Digital Delivery
Responsável por:
- assets digitais (file/link/license)
- entitlements gerados em `paid`
- download protegido (signed routes)
- logs de download e limites

Sugestão:
- `app/Models/DigitalAsset.php`, `DigitalEntitlement.php`
- `app/Http/Controllers/Store/DownloadsController.php`

### 6.7 Discord Gating
Responsável por:
- regras por produto/categoria
- verificar se usuário conectou Discord
- checar membership e role
- bloquear compra e/ou download

Sugestão:
- `app/Services/Discord/DiscordClient.php`
- `app/Services/Discord/DiscordGateService.php`

### 6.8 Conteúdo (Blog/Comentários)
Responsável por:
- posts traduzidos
- comentários com moderação

Sugestão:
- `app/Models/Post.php`, `Comment.php`
- `app/Http/Controllers/Admin/Content/*`

### 6.9 LGPD
Responsável por:
- consentimento de cookies
- exportação e exclusão/anonimização

Sugestão:
- `app/Jobs/ExportUserDataJob.php`, `DeleteUserDataJob.php`
- `app/Http/Controllers/Store/Privacy/*`

---

## 7) Modelo de consistência e transações
### 7.1 Estados do pedido
Estados sugeridos:
- `pending`, `paid`, `canceled`, `failed` (opcional), `refunded` (opcional)

### 7.2 Regra de estoque
- Não baixa em `pending`
- Baixa em `paid` (no handler do webhook / ação de “mark paid”)

### 7.3 Idempotência em webhooks
Problema: PagSeguro pode reenviar webhooks.

Recomendação:
- Usar `payments.provider_reference` único
- Se webhook já processado, retornar 200 sem reexecutar efeitos
- Efeitos colaterais (baixa estoque, entitlements, e-mails) devem ser:
  - protegidos por “guards” e/ou
  - executados em transação, com marcação de “já executado”

---

## 8) Segurança
### 8.1 Autenticação
- Usuário precisa estar autenticado para:
  - comprar (checkout)
  - acessar downloads
  - comentar (opcional; recomendado sim)

### 8.2 Rate limits
Aplicar throttle em:
- login e reset password
- endpoint de webhook
- download endpoints

### 8.3 Downloads
- URLs assinadas (signed routes)
- checar entitlement (ownership, expiração, limite)
- log de download (IP, user-agent)

### 8.4 Admin
- RBAC com roles/perms
- Níveis/hierarquia (“invisibilidade”):
  - admin só enxerga/edita usuários com nível <= seu

---

## 9) Internacionalização e moedas
### 9.1 Idiomas (pt-BR/en-US)
- Persistir escolha (cookie + user preference)
- Tables `*_translations` para catálogo/blog

### 9.2 BRL + USD
- BRL é base
- USD exibido por conversão usando taxa diária armazenada em DB
- Ao criar pedido, salvar `fx_rate_used` (para consistência)

---

## 10) Observabilidade e auditoria (MVP)
- Logs estruturados para:
  - webhooks (payload e resultado)
  - downloads (entitlement + user + ip)
  - ações administrativas sensíveis (auditoria mínima)
- Métricas avançadas ficam para pós-MVP (ou usar logs + análise)

---

## 11) Guidelines de código (recomendação)
- **Services** para integrações e regras complexas (Payments, Shipping, Discord, Pricing, FX)
- **Actions** ou “use-cases” para transições críticas:
  - `MarkOrderPaid`
  - `ApplyCouponToCart`
  - `GrantDigitalEntitlements`
- Controllers finos (validar request, chamar service/action, retornar view/redirect)
- Policies para RBAC e nível/hierarquia
- Requests form objects (`app/Http/Requests/*`) para validação

---

## 12) Principais “pontos de atenção” do MVP
1. **Deploy FTP**: risco de inconsistência. Ter checklist e janela de manutenção.
2. **Queue/cron**: garantir que o worker roda com frequência e tratar falhas (failed_jobs).
3. **Webhooks**: idempotência e logs são obrigatórios.
4. **Oversell**: sem reserva de estoque em `pending`, pode ocorrer (aceito no MVP).
5. **Digital local**: cuidado com paths, permissões e proteção (não servir arquivo direto do public).
6. **Discord**: tokens e refresh; falhas na API devem ser tratadas (mensagem UX clara).

---

## 13) Referências
- `README.md` — visão geral, setup e roadmap
- `PROJECT_BLUEPRINT.md` — escopo completo, decisões, modelo de dados e backlog macro
- `DIAGRAMS.md` — diagramas (C4, fluxos, ER e estados)

Copilot is powered by AI, so mistakes are possible. Leave a comment via the 👍 👎 to share your feedback and help improve the experience.