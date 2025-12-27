# nb-store — Tasks (MVP)

Data: **2025-12-16**  
Repo: **BlackCodePub/nb-store**  
Formato: backlog detalhado em **tarefas** (checklists), derivado de tudo que foi decidido.

> Como usar:
> - Copie seções/itens para GitHub Issues quando quiser.
> - Cada item tem **Referências de código (paths sugeridos)** para acelerar implementação.

---

## 0) Convenções e “contratos” do MVP (não quebrar)
- [ ] Loja e Admin em subdomínios com **sessões separadas**
- [ ] Checkout **multi-etapas**
- [ ] Pedido `pending` **não reserva** estoque; baixa só em `paid`
- [ ] PagSeguro: parcelamento habilitado; **juros pagos pelo cliente**
- [ ] Cupom por produto/categoria; **não** desconta frete
- [ ] Digitais locais (`storage/app`) com **links assinados**
- [ ] Idiomas: pt-BR/en-US
- [ ] Moedas: BRL base + USD por câmbio diário (cron)
- [ ] Discord gating por produto/categoria (guild + role)

---

## 1) Base do projeto (Infra + Setup)
### 1.1 Bootstrap Laravel 11
- [ ] Criar/confirmar projeto Laravel 11
- [ ] Configurar `.env.example` completo (sem secrets)
- [ ] Configurar DB MySQL (local)
- [ ] Configurar timezone `America/Sao_Paulo`
- [ ] Configurar `APP_LOCALE=pt_BR` e fallback `en_US`

**Referências de código**
- `config/app.php`
- `.env.example`
- `database/*`

### 1.2 Bootstrap + Vite
- [ ] Instalar Bootstrap (via npm) e configurar Vite
- [ ] Garantir build para produção (Hostinger)
- [ ] Definir tokens básicos (cores, tipografia, spacing) via Sass e variables

**Referências**
- `vite.config.*`
- `resources/css/app.scss` (ou equivalente) com imports do Bootstrap
- `resources/js/*`

### 1.3 Deploy Hostinger (FTP) — documentação
- [ ] Documentar checklist de deploy
- [ ] Documentar permissões de `storage/` e `bootstrap/cache`
- [ ] Documentar `storage:link`
- [ ] Documentar fallback se não existir SSH/Composer

**Referências**
- `README.md` / `CONFIGURATION.md`

---

## 2) Rotas, apps e separação Loja/Admin
### 2.1 Rotas Admin separadas
- [ ] Criar `routes/admin.php`
- [ ] Registrar no `RouteServiceProvider`
- [ ] Prefixo `admin` + domain `admin.*` (por ambiente)
- [ ] Middlewares do admin: auth + ensureAdmin

**Referências**
- `routes/admin.php`
- `app/Providers/RouteServiceProvider.php`
- `app/Http/Middleware/*`

### 2.2 Sessões separadas
- [ ] Garantir `SESSION_DOMAIN` vazio no MVP
- [ ] (Opcional) cookie names diferentes para loja/admin se necessário

**Referências**
- `config/session.php`
- `app/Http/Middleware/SetSessionCookieName.php` (se criar)

---

## 3) Autenticação (Loja)
### 3.1 Auth base
- [ ] Cadastro
- [ ] Login / Logout
- [ ] Recuperação de senha
- [ ] Confirmação de e-mail obrigatória
- [ ] Throttle login/reset

**Referências**
- `app/Http/Controllers/Auth/*`
- `resources/views/auth/*`
- `routes/web.php`
- `config/auth.php`

### 3.2 Preferências do usuário
- [ ] Campos `locale` e `currency` no `users`
- [ ] Tela “Minha Conta” para atualizar preferências

**Referências**
- `app/Models/User.php`
- migrations `users`
- `app/Http/Controllers/Store/Account/*`

---

## 4) Layouts + UI kit (Loja/Admin)
### 4.1 Layout base loja
- [ ] Header, footer, container, navegação
- [ ] Estado autenticado/desconectado
- [ ] Componentes: botões, inputs, alertas, cards

**Referências**
- `resources/views/store/layouts/*`
- `resources/views/components/*`

### 4.2 Layout base admin
- [ ] Sidebar + header + breadcrumbs
- [ ] Tabelas + filtros + forms
- [ ] Feedback de ações (toast/alert)

**Referências**
- `resources/views/admin/layouts/*`
- `resources/views/admin/components/*`

---

## 5) Queue + Scheduler (Hostinger)
### 5.1 Queue database
- [ ] `php artisan queue:table`
- [ ] migrations + `failed_jobs`
- [ ] Config `QUEUE_CONNECTION=database`
- [ ] Test job simples (smoke test)

**Referências**
- `config/queue.php`
- migrations `jobs`, `failed_jobs`
- `app/Jobs/*`

### 5.2 Cron
- [ ] `schedule:run` por minuto
- [ ] `queue:work --stop-when-empty` por minuto
- [ ] Documentação no `CONFIGURATION.md`

**Referências**
- `app/Console/Kernel.php`
- `CONFIGURATION.md`

---

## 6) RBAC (Admin)
### 6.1 Modelagem
- [ ] Tabelas `roles`, `permissions`, pivots
- [ ] Seed inicial:
  - admin master (nível alto)
  - editor (nível médio)
  - suporte (nível baixo)

**Referências**
- `app/Models/Role.php`, `Permission.php`
- `database/migrations/*roles*`, `*permissions*`
- `database/seeders/*`

### 6.2 Policies + “invisibilidade por nível”
- [ ] Policies para ações sensíveis (users, roles, products, orders)
- [ ] Regra: só listar/editar usuários de `level <= meu_level`

**Referências**
- `app/Policies/*`
- `app/Providers/AuthServiceProvider.php`

---

## 7) i18n (pt-BR/en-US) + seletor de idioma
- [ ] Middleware `SetLocale`
- [ ] Persistência (cookie + user preference)
- [ ] Traduções DB para catálogo/blog (`*_translations`)
- [ ] UI: seletor de idioma na loja (e opcional no admin)

**Referências**
- `app/Http/Middleware/SetLocale.php`
- `resources/lang/*`
- migrations `*_translations`

---

## 8) FX (BRL base + USD) — câmbio diário
### 8.1 Persistência e provider
- [ ] Tabela `exchange_rates`
- [ ] Service `ExchangeRateService`
- [ ] Job diário `FetchExchangeRateJob`
- [ ] Scheduler para rodar 1x/dia

**Referências**
- `app/Services/FX/*`
- `app/Jobs/FetchExchangeRateJob.php`
- `app/Console/Kernel.php`

### 8.2 Uso no preço/pedido
- [ ] Converter BRL->USD para exibição
- [ ] Salvar `fx_rate_used` no pedido ao criar `pending`

**Referências**
- `app/Services/Pricing/*`
- `app/Models/Order.php`

---

## 9) Catálogo (Categorias, Produtos, Variantes, Imagens)
### 9.1 Categorias
- [ ] CRUD categorias no admin
- [ ] Traduções (nome/descrição) pt/en
- [ ] Slug e hierarquia (parent_id opcional)
- [ ] Listagem na loja

**Referências**
- `app/Models/Category.php`
- `app/Http/Controllers/Admin/CategoriesController.php`
- `resources/views/store/catalog/*`

### 9.2 Produtos
- [ ] CRUD produtos no admin
- [ ] Tipo: `physical` / `digital`
- [ ] Traduções pt/en (nome, descrição, SEO opcional)
- [ ] Status ativo/inativo

**Referências**
- `app/Models/Product.php`
- `app/Models/ProductTranslation.php`

### 9.3 Variantes
- [ ] CRUD variantes no admin
- [ ] Preço base BRL por variante
- [ ] Estoque (nullable para digital)
- [ ] Seleção de variante na PDP (loja)

**Referências**
- `app/Models/ProductVariant.php`
- `resources/views/store/product/show.blade.php` (ex.)

### 9.4 Imagens
- [ ] Upload de imagens (admin)
- [ ] Ordenação
- [ ] Exibição na loja

**Referências**
- `app/Models/ProductImage.php`
- `storage/app/public/*`

---

## 10) Carrinho
- [ ] `carts` e `cart_items`
- [ ] Adicionar/remover/alterar qty
- [ ] Suportar itens com `variant_id`
- [ ] Calcular subtotal BRL
- [ ] Exibir conversão USD (se moeda USD selecionada)

**Referências**
- `app/Http/Controllers/Store/CartController.php`
- `app/Services/Pricing/CartPricingService.php`
- `app/Models/Cart.php`, `CartItem.php`

---

## 11) Cupons (não afeta frete)
### 11.1 Modelo e regras
- [ ] `coupons` + relações com produtos e categorias
- [ ] Tipos: percent / fixed
- [ ] Regras:
  - validade (start/end)
  - limite global e por usuário
  - subtotal mínimo (opcional)
- [ ] Aplicação apenas em itens elegíveis (carrinho misto)
- [ ] Rateio do desconto por item e snapshot no pedido

**Referências**
- `app/Models/Coupon.php`
- `app/Services/Pricing/CouponService.php`

---

## 12) Checkout multi-etapas + Orders
### 12.1 Steps
- [ ] Step 1: endereço (validação completa)
- [ ] Step 2: frete (Correios)
- [ ] Step 3: pagamento (PagSeguro)
- [ ] Step 4: revisão/confirmar

**Referências**
- `app/Http/Controllers/Store/Checkout/*`
- `resources/views/store/checkout/*`

### 12.2 Orders (persistência)
- [ ] `orders`, `order_items`, `order_addresses`, `order_shipments`
- [ ] Criar `Order` com `status=pending`
- [ ] Salvar snapshots (nome, preço, tipo, desconto por item)
- [ ] Totais:
  - subtotal
  - desconto (somente itens elegíveis)
  - frete (sem desconto)
  - total

**Referências**
- `app/Models/Order.php`, `OrderItem.php`
- `app/Services/Pricing/OrderTotalCalculator.php` (sugestão)

---

## 13) Shipping (Correios API direta)
- [ ] Client Correios
- [ ] Quote service (PAC/SEDEX etc.)
- [ ] Normalização de resposta
- [ ] Persistir serviço escolhido em `order_shipments`

**Referências**
- `app/Services/Shipping/CorreiosClient.php`
- `app/Services/Shipping/ShippingQuoteService.php`

---

## 14) Payments (PagSeguro) + Webhooks (idempotente)
### 14.1 Criar cobrança
- [ ] PagSeguro client
- [ ] Criar checkout/cobrança do pedido
- [ ] Suportar parcelamento (juros do cliente)
- [ ] Salvar referência no `payments`

**Referências**
- `app/Services/Payments/PagSeguroClient.php`
- `app/Models/Payment.php`

### 14.2 Webhook
- [ ] Endpoint `POST /webhooks/pagseguro`
- [ ] Validar assinatura/secret (se disponível)
- [ ] Idempotência por `provider_reference`
- [ ] Atualizar `orders.status`
- [ ] Disparar efeitos:
  - baixa estoque
  - entitlements digitais
  - e-mails

**Referências**
- `app/Http/Controllers/Webhooks/PagSeguroWebhookController.php`
- `app/Services/Payments/PagSeguroWebhookHandler.php`
- `app/Actions/Orders/MarkOrderPaid.php`

---

## 15) Estoque (baixa em `paid`)
- [ ] Ao marcar `paid`, decrementar estoque da variante/produto
- [ ] Tratar caso estoque insuficiente no momento do `paid` (decidir comportamento: cancelar? backorder? alertar?)
- [ ] Admin: exibir estoque e alertas

**Referências**
- `app/Actions/Orders/DecrementStock.php` (sugestão)
- `app/Models/ProductVariant.php`

---

## 16) Digital delivery (storage local + links assinados)
### 16.1 Assets digitais
- [ ] `digital_assets` com kind:
  - file (path)
  - link (URL)
  - license (meta)
- [ ] Admin: CRUD assets por produto/variante

**Referências**
- `app/Models/DigitalAsset.php`
- `app/Http/Controllers/Admin/DigitalAssetsController.php`

### 16.2 Entitlements e downloads
- [ ] Criar entitlements ao `paid`
- [ ] Página “Meus Downloads”
- [ ] Download controller com:
  - auth
  - signed route
  - limite de downloads
  - expiração opcional
  - logs de download

**Referências**
- `app/Models/DigitalEntitlement.php`
- `app/Http/Controllers/Store/DownloadsController.php`
- `routes/web.php` (signed routes)

---

## 17) Discord gating (produto/categoria)
### 17.1 OAuth conectar Discord
- [ ] Rotas de auth Discord
- [ ] Persistir tokens em `social_accounts` (criptografado)
- [ ] Refresh token (se necessário)

**Referências**
- `app/Services/Discord/DiscordClient.php`
- `app/Http/Controllers/Store/Auth/DiscordController.php`

### 17.2 Regras e checagem
- [ ] `discord_rules` por produto/categoria
- [ ] Checar gating:
  - no checkout (bloquear)
  - no download (bloquear)
- [ ] UX: mensagem clara + CTA “Conectar Discord”

**Referências**
- `app/Services/Discord/DiscordGateService.php`
- `app/Models/DiscordRule.php`

---

## 18) Minha Conta
- [ ] Perfil (nome, senha, idioma, moeda)
- [ ] Pedidos (listagem + detalhe)
- [ ] Downloads
- [ ] Conectar/Desconectar Discord

**Referências**
- `app/Http/Controllers/Store/Account/*`
- `resources/views/store/account/*`

---

## 19) Blog + Comentários (moderação)
### 19.1 Blog
- [ ] `posts` + `post_translations`
- [ ] Admin: CRUD posts
- [ ] Loja: listagem + detalhe do post

**Referências**
- `app/Models/Post.php`
- `app/Http/Controllers/Admin/PostsController.php`

### 19.2 Comentários
- [ ] `comments` com status `pending/approved/rejected`
- [ ] Loja: criar comentário
- [ ] Admin: moderar comentários

**Referências**
- `app/Models/Comment.php`
- `app/Http/Controllers/Admin/CommentsController.php`

---

## 20) LGPD
- [ ] Cookie consent (registrar versão)
- [ ] Exportação de dados (job + arquivo)
- [ ] Exclusão/anonimização (job/processo)
- [ ] Tela no “Minha Conta” para solicitar ações

**Referências**
- `app/Jobs/ExportUserDataJob.php`
- `app/Jobs/DeleteUserDataJob.php`
- `app/Models/CookieConsent.php`

---

## 21) Hardening / Qualidade
### 21.1 Rate limiting
- [ ] Login
- [ ] Webhook PagSeguro
- [ ] Downloads

**Referências**
- `app/Providers/RouteServiceProvider.php` (rate limiters)
- `routes/*`

### 21.2 Logs/auditoria
- [ ] Logar webhooks (sem secrets)
- [ ] Logar downloads
- [ ] Logar ações admin sensíveis (mínimo)

**Referências**
- `storage/logs/laravel.log`
- `digital_download_logs` table (para downloads)

### 21.3 Testes mínimos
- [ ] Unit tests: coupon + pricing
- [ ] Feature tests: webhook idempotente + mark paid + baixa estoque
- [ ] Feature tests: download entitlement

**Referências**
- `tests/Unit/*`
- `tests/Feature/*`

---

## 22) Go-live checklist
- [ ] DNS e SSL ok (loja/admin)
- [ ] `.env` produção completo
- [ ] Migrations aplicadas
- [ ] Cron schedule/queue funcionando
- [ ] Webhook PagSeguro configurado (prod)
- [ ] Câmbio diário funcionando
- [ ] Backup DB configurado
- [ ] Teste de compra ponta-a-ponta (físico e digital)

---

Copilot is powered by AI, so mistakes are possible. Leave a comment via the 👍 👎 to share your feedback and help improve the experience.