# nb-store (Next.js) — TODO List do MVP

Data: **2025-01-XX** (gerado automaticamente)  
Stack: **Next.js 16.1 + Turbopack + NextAuth + Prisma + MySQL + Bootstrap 5**

Este documento lista todas as tarefas pendentes para completar o MVP, baseado na documentação do projeto em `PHP/docs/` e `PHP/dev/`.

---

## 🟢 Concluídos

### Infraestrutura

- [x] Setup Next.js 16.1 com Turbopack
- [x] Prisma configurado com MySQL (Hostinger)
- [x] NextAuth com Credentials + Discord + Email providers
- [x] RBAC básico implementado (Role, Permission, UserRole)
- [x] Layout Admin com Bootstrap 5
- [x] API de downloads digitais com signed URLs
- [x] Webhooks de pagamento básicos
- [x] Catálogo Admin: CRUD categorias, produtos, variantes, imagens
- [x] Tipo Session estendido com user.id (types/next-auth.d.ts)

---

## 🔴 Prioridade Alta (Sprint 1-3)

### 1. Loja: Páginas Públicas

- [ ] **Home Page** - Listagem de produtos em destaque, categorias
- [ ] **Categoria** - Página /category/[slug] com filtro por categoria
- [ ] **PDP (Product Detail Page)** - Página /product/[slug] com:
  - Imagens do produto (carousel)
  - Descrição e preço
  - Seleção de variante
  - Botão "Adicionar ao Carrinho"

### 2. Carrinho

- [ ] **Schema Prisma** - Tabelas Cart e CartItem
- [ ] **API** - CRUD de carrinho (/api/cart)
- [ ] **Componente** - Drawer/modal de carrinho
- [ ] **Persistência** - Carrinho por usuário logado (sem guest checkout)

### 3. Checkout Multi-etapas

- [ ] **Step 1: Endereço**
  - Formulário completo (CEP, rua, número, complemento, bairro, cidade, estado)
  - Validação e autocompletar via ViaCEP
  - Persistência em OrderAddress
  
- [ ] **Step 2: Frete (Correios)**
  - Integração Correios API direta
  - Cotação de serviços (PAC, SEDEX)
  - Seleção de serviço e persistência

- [ ] **Step 3: Pagamento (PagSeguro)**
  - Integração PagSeguro
  - Parcelamento com juros pelo cliente
  - Checkout transparente ou redirect

- [ ] **Step 4: Revisão**
  - Resumo do pedido (itens, frete, total)
  - Confirmação e criação do Order (status: pending)

---

## 🟡 Prioridade Média (Sprint 4-5)

### 4. Cupons de Desconto

- [ ] **Schema Prisma** - Tabelas Coupon, CouponProduct, CouponCategory, CouponRedemption
- [ ] **Regras de negócio**:
  - Tipos: percent / fixed
  - Restrição por produto/categoria
  - **Cupom NÃO desconta frete**
  - Validade (start/end)
  - Limite global e por usuário
  - Subtotal mínimo
- [ ] **Serviço** - CouponService para validação e aplicação
- [ ] **UI** - Campo de cupom no checkout

### 5. Webhooks PagSeguro (Idempotência)

- [ ] **Endpoint** - /api/webhooks/pagseguro
- [ ] **Idempotência** - Não duplicar efeitos ao reprocessar
- [ ] **Transições**:
  - pending → paid (baixa estoque)
  - pending → canceled/failed
- [ ] **Logs** - PaymentWebhookLog com payload sanitizado
- [ ] **Rate limiting** - Throttle no endpoint

### 6. Emails Transacionais

- [ ] **Confirmação de pedido pago**
- [ ] **Notificação de cancelamento/falha**
- [ ] **Queue database** - Envio assíncrono via job

---

## 🟠 Prioridade Normal (Sprint 6-7)

### 7. Multi-idioma (i18n)

- [ ] **Middleware SetLocale** - Auto-detect + seletor + persistência
- [ ] **Schema Prisma** - Tabelas *_translations (CategoryTranslation, ProductTranslation)
- [ ] **Seletor de idioma** - pt-BR / en-US na loja
- [ ] **Traduções estáticas** - Arquivos de tradução para UI

### 8. Multi-moeda (FX)

- [ ] **Schema Prisma** - Tabela exchange_rates
- [ ] **Job diário** - FetchExchangeRateJob (API de câmbio)
- [ ] **Serviço** - Conversão BRL→USD para exibição
- [ ] **Pedido** - Salvar fx_rate_used ao criar

### 9. Entrega Digital

- [ ] **Entitlements** - Gerar ao marcar paid
- [ ] **Downloads seguros**:
  - URLs assinadas (signed routes) ✅
  - Limite de downloads
  - Expiração (expires_at)
  - Logs (ip, user-agent) ✅
- [ ] **Página Meus Downloads** - Área do cliente

### 10. Discord Gating

- [ ] **OAuth Discord** - Conectar conta Discord
- [ ] **Schema** - DiscordRule por produto/categoria
- [ ] **Checagem no checkout** - Bloquear se não atende guild+role
- [ ] **Checagem no download** - Consistência de acesso

---

## 🔵 Prioridade Baixa (Sprint 8)

### 11. Blog + Comentários

- [ ] **Schema** - Post, PostTranslation, Comment
- [ ] **Admin** - CRUD de posts com traduções pt/en
- [ ] **Loja** - Listagem e página do post
- [ ] **Comentários**:
  - Criação na loja
  - Moderação no admin (pending/approved/rejected)

### 12. LGPD

- [ ] **Consentimento cookies** - Banner + registro de aceite
- [ ] **Exportação de dados** - Job para gerar JSON/CSV
- [ ] **Exclusão de conta**:
  - Soft-delete
  - Anonimização (preservar integridade de pedidos)

### 13. Área Minha Conta

- [ ] **Meus Pedidos** - Listagem com status e detalhes
- [ ] **Meus Downloads** - Digitais comprados
- [ ] **Conectar Discord** - OAuth flow
- [ ] **Preferências** - Idioma/moeda

---

## 🔧 Melhorias Técnicas

### Configuração

- [ ] **next.config.mjs** - Adicionar allowedDevOrigins para warnings cross-origin
- [ ] **Sass** - Atualizar bootstrap-sass-modules para resolver deprecações
- [ ] **Rate limiting global** - Implementar em rotas sensíveis

### Admin

- [ ] **RBAC níveis** - Implementar "invisibilidade" (só ver users de level <= meu_level)
- [ ] **Logs de auditoria** - Registrar ações sensíveis
- [ ] **Dashboard** - Métricas básicas (pedidos, receita, estoque baixo)

### Segurança

- [ ] **Throttle** - Login, webhooks, downloads
- [ ] **Validação** - FormRequest em todas as APIs
- [ ] **Sanitização** - Não logar secrets

---

## 📋 Contratos do MVP (Não Quebrar!)

1. ✅ Loja e Admin em subdomínios (sessões separadas via cookies diferentes)
2. ⏳ Checkout multi-etapas
3. ✅ Pedido `pending` NÃO reserva estoque; baixa só em `paid`
4. ⏳ PagSeguro: parcelamento habilitado; juros pagos pelo cliente
5. ⏳ Cupom por produto/categoria; NÃO desconta frete
6. ✅ Digitais locais (storage) com links assinados
7. ⏳ Idiomas: pt-BR/en-US
8. ⏳ Moedas: BRL base + USD por câmbio diário
9. ⏳ Discord gating por produto/categoria (guild + role)

---

## 📊 Status Geral

| Épico | Progresso |
|-------|-----------|

| Base & UI | 80% |
| Admin & Catálogo | 90% |
| Carrinho & Checkout | 10% |
| Orders & Payments | 30% |
| Digital Delivery | 50% |
| Discord Gating | 0% |
| Conteúdo (Blog) | 0% |
| LGPD | 0% |

---

## 🚀 Próximos Passos Sugeridos

1. **Implementar Carrinho** - Base necessária para checkout
2. **Criar páginas da Loja** - Home, categoria, PDP
3. **Checkout Step 1** - Formulário de endereço
4. **Integrar Correios** - Frete real
5. **Integrar PagSeguro** - Pagamento com parcelamento
