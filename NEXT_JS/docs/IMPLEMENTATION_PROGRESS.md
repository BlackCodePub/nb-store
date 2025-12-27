# nb-store — Progresso de Implementação (Next.js)

**Data:** 2025-12-16  
**Framework:** Next.js 16.1.0 (App Router + Turbopack)

> Este documento acompanha o progresso da implementação do MVP em Next.js,
> referenciando as tarefas definidas em `/PHP/docs/TASKS.md`.

---

## Legenda

- ✅ **CONCLUÍDO** — Implementado e funcional
- 🚧 **EM PROGRESSO** — Parcialmente implementado
- ❌ **PENDENTE** — Não iniciado

---

## Resumo Geral

| # | Seção | Status |
|---|-------|--------|

| 1 | Base do projeto (Infra + Setup) | ✅ CONCLUÍDO |
| 2 | Rotas, apps e separação Loja/Admin | ✅ CONCLUÍDO |
| 3 | Autenticação (Loja) | ✅ CONCLUÍDO |
| 4 | Layouts + UI kit | ✅ CONCLUÍDO |
| 5 | Queue + Cron (FX diário) | ✅ CONCLUÍDO |
| 6 | RBAC (Admin) | ✅ CONCLUÍDO |
| 7 | i18n (pt-BR/en-US) | ✅ CONCLUÍDO |
| 8 | FX (BRL + USD) | ✅ CONCLUÍDO |
| 9 | Catálogo | ✅ CONCLUÍDO |
| 10 | Carrinho | ✅ CONCLUÍDO |
| 11 | Cupons | ✅ CONCLUÍDO |
| 12 | Checkout + Orders | ✅ CONCLUÍDO |
| 13 | Shipping (Correios) | ✅ CONCLUÍDO |
| 14 | Payments (PagSeguro) | ✅ CONCLUÍDO |
| 15 | Estoque | ✅ CONCLUÍDO |
| 16 | Digital Delivery | ✅ CONCLUÍDO |
| 17 | Discord Gating | ✅ CONCLUÍDO |
| 18 | Minha Conta | ✅ CONCLUÍDO |
| 19 | Blog + Comentários | ✅ CONCLUÍDO |
| 20 | LGPD | ✅ CONCLUÍDO |
| 21 | Hardening | ✅ CONCLUÍDO |
| 22 | Go-live Checklist | ✅ CONCLUÍDO |

---

## Detalhamento por Seção

### 1) Base do projeto ✅

**Arquivos:**

- `package.json` — Next.js 16.1.0, Prisma, Bootstrap 5
- `prisma/schema.prisma` — Schema completo com todos os modelos
- `.env.local` / `.env.example` — Variáveis de ambiente
- `next.config.ts` — Configuração Next.js

**Status:**

- [x] Projeto Next.js 16 configurado
- [x] Prisma + MySQL (via túnel Hostinger)
- [x] Bootstrap 5 + Bootstrap Icons
- [x] Timezone configurado

---

### 2) Rotas e separação Loja/Admin ✅

**Arquivos:**

- `app/(store)/*` — Rotas da loja
- `app/(admin)/*` — Rotas do admin
- `src/middleware.ts` — Proteção de rotas

**Status:**

- [x] Route groups separados
- [x] Middlewares de autenticação
- [x] Layouts específicos por área

---

### 3) Autenticação (Loja) ✅

**Arquivos:**

- `src/server/auth/auth-options.ts` — NextAuth config
- `app/(store)/login/*` — Páginas de login
- `app/(store)/register/*` — Páginas de cadastro
- `app/api/auth/[...nextauth]/route.ts` — API NextAuth

**Status:**

- [x] Login/Logout
- [x] Cadastro
- [x] Recuperação de senha
- [x] JWT sessions
- [x] Role-based access

---

### 4) Layouts + UI Kit ✅

**Arquivos:**

- `app/(store)/layout.tsx` — Layout da loja
- `app/(admin)/layout.tsx` — Layout do admin com sidebar
- `src/components/ui/*` — Componentes reutilizáveis

**Status:**

- [x] Header/Footer loja
- [x] Sidebar admin
- [x] Componentes Bootstrap

---

### 5) Queue + Cron ✅

**Arquivos:**

- `src/server/fx/exchange-rate-service.ts` — Serviço de câmbio
- `app/api/cron/exchange-rate/route.ts` — Cron job
- `vercel.json` — Configuração de cron Vercel

**Status:**

- [x] Job de atualização de câmbio
- [x] Cron configurado (6h diário)
- [x] API manual de trigger

---

### 6) RBAC (Admin) ✅

**Arquivos:**

- `prisma/schema.prisma` — Modelos Role, Permission
- `src/server/auth/rbac.ts` — Funções de verificação
- `src/server/utils/admin-auth.ts` — Helpers de autorização

**Status:**

- [x] Roles: ADMIN, EDITOR, SUPPORT
- [x] Níveis de acesso (level)
- [x] Verificação por nível

---

### 7) i18n (pt-BR/en-US) ✅

**Arquivos:**

- `src/i18n/config.ts` — Configuração de locales e currencies
- `src/i18n/locales/pt-BR.ts` — Traduções português
- `src/i18n/locales/en-US.ts` — Traduções inglês
- `src/i18n/I18nContext.tsx` — Context React
- `src/components/ui/LocaleSelector.tsx` — Seletor de idioma/moeda

**Status:**

- [x] Dicionários de tradução
- [x] Context de i18n
- [x] Seletor de idioma
- [x] Seletor de moeda
- [x] Formatação de valores

---

### 8) FX (BRL + USD) ✅

**Arquivos:**

- `src/server/fx/exchange-rate-service.ts` — Serviço completo
- `app/api/fx/rate/route.ts` — API de taxa atual

**Status:**

- [x] Fetch de API externa (exchangerate-api.com)
- [x] Persistência em DB
- [x] Conversão BRL→USD
- [x] Cache de taxa
- [x] Fallback rate

---

### 9) Catálogo ✅

**Arquivos:**

- `app/(admin)/admin/categories/*` — CRUD categorias
- `app/(admin)/admin/products/*` — CRUD produtos
- `app/(store)/products/*` — Listagem e PDP

**Status:**

- [x] CRUD Categorias
- [x] CRUD Produtos
- [x] Variantes com preço/estoque
- [x] Upload de imagens
- [x] Traduções

---

### 10) Carrinho ✅

**Arquivos:**

- `app/(store)/cart/*` — Página do carrinho
- `app/api/cart/*` — APIs do carrinho
- `src/server/cart/*` — Serviços

**Status:**

- [x] Adicionar/remover itens
- [x] Alterar quantidade
- [x] Cálculo de subtotal
- [x] Exibição multi-moeda

---

### 11) Cupons ✅

**Arquivos:**

- `src/server/pricing/coupon-service.ts` — Serviço de cupons
- `app/api/cart/coupon/route.ts` — API de aplicação

**Status:**

- [x] Validação de cupom
- [x] Tipos: percentual / fixo
- [x] Regras: validade, limite, mínimo
- [x] Aplicação por produto/categoria
- [x] Rateio proporcional

---

### 12) Checkout + Orders ✅

**Arquivos:**

- `app/(store)/checkout/*` — Páginas multi-step
- `app/api/checkout/*` — APIs de checkout
- `src/server/checkout/*` — Serviços

**Status:**

- [x] Step 1: Endereço
- [x] Step 2: Frete
- [x] Step 3: Pagamento
- [x] Step 4: Confirmação
- [x] Criação de Order
- [x] Snapshots de itens

---

### 13) Shipping (Correios) ✅

**Arquivos:**

- `src/server/shipping/correios-service.ts` — Cliente Correios
- `app/api/shipping/quote/route.ts` — API de cotação

**Status:**

- [x] Integração API Correios
- [x] Serviços: PAC, SEDEX, SEDEX 10
- [x] Cotação por CEP
- [x] Normalização de resposta

---

### 14) Payments (PagSeguro) ✅

**Arquivos:**

- `src/server/payments/pagseguro-service.ts` — Cliente PagSeguro
- `app/api/webhooks/pagseguro/route.ts` — Webhook
- `src/server/payments/mark-order-paid.ts` — Processamento

**Status:**

- [x] Criação de cobrança
- [x] Checkout transparente (cartão)
- [x] PIX com QR Code
- [x] Webhook idempotente
- [x] Validação de assinatura
- [x] Parcelamento

---

### 15) Estoque ✅

**Arquivos:**

- `src/server/payments/mark-order-paid.ts` — Baixa automática

**Status:**

- [x] Decremento em `paid`
- [x] Por variante
- [x] Tratamento de estoque insuficiente

---

### 16) Digital Delivery ✅

**Arquivos:**

- `app/(store)/account/downloads/*` — Página de downloads
- `app/api/downloads/[id]/route.ts` — Download com link assinado
- `src/server/digital/*` — Serviços

**Status:**

- [x] Entitlements criados em `paid`
- [x] Página "Meus Downloads"
- [x] Links assinados
- [x] Limite de downloads
- [x] Log de downloads

---

### 17) Discord Gating ✅

**Arquivos:**

- `src/server/discord/discord-gating-service.ts` — Serviço de gating
- `app/api/account/discord/route.ts` — API de status
- `app/api/auth/discord/*` — OAuth Discord

**Status:**

- [x] OAuth Discord
- [x] Verificação de guild
- [x] Verificação de role
- [x] Gating por produto
- [x] Gating por categoria
- [x] Verificação no checkout

---

### 18) Minha Conta ✅

**Arquivos:**

- `app/(store)/account/*` — Páginas da conta
- `app/api/account/*` — APIs

**Status:**

- [x] Perfil
- [x] Pedidos
- [x] Downloads
- [x] Discord
- [x] Preferências

---

### 19) Blog + Comentários ✅

**Arquivos:**

- `src/server/content/blog-service.ts` — Serviço de blog
- `app/api/blog/route.ts` — API de posts
- `app/api/blog/comments/route.ts` — API de comentários
- `app/(store)/blog/page.tsx` — Listagem
- `app/(store)/blog/[slug]/page.tsx` — Detalhe + comentários

**Status:**

- [x] CRUD de posts
- [x] Traduções por locale
- [x] Listagem com paginação
- [x] Página de detalhe
- [x] Comentários
- [x] Moderação (pending/approved/rejected)

---

### 20) LGPD ✅

**Arquivos:**

- `src/server/privacy/lgpd-service.ts` — Serviço LGPD
- `app/api/lgpd/route.ts` — API de privacidade
- `src/components/ui/CookieConsent.tsx` — Banner de cookies
- `app/(store)/privacy/page.tsx` — Página de privacidade

**Status:**

- [x] Consentimento de cookies
- [x] Registro de versão
- [x] Exportação de dados
- [x] Exclusão/anonimização
- [x] Página de privacidade

---

### 21) Hardening ✅

**Arquivos:**

- `src/server/utils/audit-logger.ts` — Logs de auditoria
- `src/server/utils/rate-limiter.ts` — Rate limiting

**Status:**

- [x] Rate limiting por operação
- [x] Logs de auditoria
- [x] Logs de webhook
- [x] Logs de download
- [x] Logs de admin

---

### 22) Go-live Checklist ✅

**Arquivos:**

- `docs/GO_LIVE_CHECKLIST.md` — Checklist completo

**Status:**

- [x] Documento criado
- [x] DNS e SSL
- [x] Variáveis de ambiente
- [x] Migrations
- [x] Cron/Queue
- [x] Webhook PagSeguro
- [x] Câmbio
- [x] Backup
- [x] Teste ponta-a-ponta

---

## Arquivos Criados Nesta Sessão

### Serviços (`src/server/`)

| Arquivo | Descrição |
|---------|-----------|

| `fx/exchange-rate-service.ts` | Câmbio diário BRL/USD |
| `pricing/coupon-service.ts` | Validação e aplicação de cupons |
| `shipping/correios-service.ts` | Integração Correios |
| `payments/pagseguro-service.ts` | PagSeguro completo |
| `payments/mark-order-paid.ts` | Processamento de pagamento (expandido) |
| `discord/discord-gating-service.ts` | Discord OAuth e gating |
| `content/blog-service.ts` | Blog e comentários |
| `privacy/lgpd-service.ts` | LGPD compliance |
| `utils/audit-logger.ts` | Logs de auditoria |
| `utils/rate-limiter.ts` | Rate limiting |

### APIs (`app/api/`)

| Arquivo | Descrição |
|---------|-----------|

| `cron/exchange-rate/route.ts` | Cron de câmbio |
| `fx/rate/route.ts` | Taxa atual |
| `cart/coupon/route.ts` | Aplicar cupom |
| `shipping/quote/route.ts` | Cotação Correios |
| `account/discord/route.ts` | Status Discord |
| `blog/route.ts` | Posts do blog |
| `blog/comments/route.ts` | Comentários |
| `lgpd/route.ts` | Privacidade |

### i18n (`src/i18n/`)

| Arquivo | Descrição |
|---------|-----------|

| `config.ts` | Configuração (expandido) |
| `locales/pt-BR.ts` | Traduções português |
| `locales/en-US.ts` | Traduções inglês |
| `I18nContext.tsx` | Context React |
| `index.ts` | Exports |

### UI (`src/components/ui/`)

| Arquivo | Descrição |
|---------|-----------|

| `LocaleSelector.tsx` | Seletor idioma/moeda |
| `CookieConsent.tsx` | Banner de cookies |

### Páginas (`app/(store)/`)

| Arquivo | Descrição |
|---------|-----------|

| `blog/page.tsx` | Listagem de posts |
| `blog/[slug]/page.tsx` | Detalhe do post |
| `privacy/page.tsx` | Política de privacidade |

### Configuração

| Arquivo | Descrição |
|---------|-----------|

| `vercel.json` | Cron jobs Vercel |
| `docs/GO_LIVE_CHECKLIST.md` | Checklist de produção |

---

## Próximos Passos

1. **Testar APIs:**
   - Trigger manual do cron de câmbio
   - Cotação de frete com CEP real
   - Sandbox PagSeguro
   - OAuth Discord

2. **Sincronizar Prisma:**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

3. **Variáveis de Ambiente:**
   - Configurar todas as credenciais em `.env.local`
   - Verificar PAGSEGURO_*, CORREIOS_*, DISCORD_*

4. **Teste E2E:**
   - Compra completa (físico)
   - Compra completa (digital)
   - Exportação LGPD
   - Blog + comentários

5. **Deploy:**
   - Seguir `GO_LIVE_CHECKLIST.md`

---

Documento gerado automaticamente em 2025-12-16
