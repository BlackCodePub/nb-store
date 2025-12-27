# nb-store — Tasks (MVP, Next.js)

Data: **2025-12-18**  
Repo: **BlackCodePub/nb-store (variant Next.js)**  
Formato: backlog detalhado em **tarefas** (checklists), derivado das decisões do MVP.

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
- [ ] Digitais privados (S3/R2) com **links assinados**
- [ ] Idiomas: pt-BR/en-US
- [ ] Moedas: BRL base + USD por câmbio diário (cron)
- [ ] Discord gating por produto/categoria (guild + role)

---

## 1) Base do projeto (Infra + Setup)
### 1.1 Bootstrap Next.js
- [ ] Criar/confirmar projeto Next.js 14 com App Router e TS
- [ ] Configurar `.env.example` completo (sem secrets)
- [ ] Configurar Prisma + DB
- [ ] Configurar timezone/locale padrão (America/Sao_Paulo)

### 1.2 Bootstrap + Build
- [ ] Instalar Bootstrap (npm) e configurar estilos (Sass/SCSS) no App Router
- [ ] Garantir build para produção (Vercel)
- [ ] Definir tokens básicos (cores, tipografia, spacing)

**Referências**
- `next.config.js`
- `src/styles/global.scss`
- `app/layout.tsx`

### 1.3 Deploy Vercel — documentação
- [ ] Documentar checklist de deploy
- [ ] Documentar envs (PagSeguro, Discord, storage, FX, NextAuth)
- [ ] Documentar cron (Vercel Cron) e storage privado

**Referências**
- `README.md` / `CONFIGURATION.md`

---

## 2) Rotas, apps e separação Loja/Admin
### 2.1 Segmentos
- [ ] Criar segmentos `(store)` e `(admin)` no App Router
- [ ] Middleware para host-based routing/cookie names
- [ ] Guards de admin (NextAuth + RBAC)

**Referências**
- `app/(store)/*`, `app/(admin)/*`
- `middleware.ts`
- `src/server/auth/*`

### 2.2 Sessões separadas
- [ ] Garantir cookies distintos por host
- [ ] Configurar `NEXTAUTH_URL` e cookie names

**Referências**
- `next-auth.config.ts`
- `middleware.ts`

---

## 3) Autenticação (Loja)
### 3.1 Auth base
- [x] Cadastro/login/logout
- [x] Recuperação de senha
- [x] Confirmação de e-mail obrigatória
- [x] Throttle login/reset

**Referências**
- `app/api/auth/[...nextauth]/route.ts`
- `app/api/auth/reset-request/route.ts` — solicita reset com email
- `app/api/auth/reset-confirm/route.ts` — confirma token e nova senha
- `app/api/auth/verify-email/route.ts` — verifica e-mail
- `app/api/auth/resend-verification/route.ts` — reenvia e-mail de verificação
- `src/server/utils/email.ts` — serviço de envio de emails
- `src/server/auth/*`
- `src/components/auth/*`

### 3.2 Preferências do usuário
- [ ] Campos `locale` e `currency` no `User`
- [ ] Tela “Minha Conta” para atualizar preferências

**Referências**
- `prisma/schema.prisma`
- `app/(store)/account/*`

---

## 4) Layouts + UI kit (Loja/Admin)
### 4.1 Layout base loja
- [x] Header, footer, navegação
- [x] Estado autenticado/desconectado
- [x] Componentes Bootstrap: botões, inputs, alertas, cards

### 4.2 Layout base admin
- [x] Sidebar + header + breadcrumbs
- [x] Tabelas + filtros + forms
- [x] Feedback de ações (toast/alert)

**Referências**
- `app/(store)/layout.tsx`
- `app/(admin)/layout.tsx` — sidebar dark, collapsible, ícones, breadcrumbs
- `src/components/admin/DataTable.tsx` — tabela reutilizável com paginação, ordenação, busca
- `src/components/ui/*`

---

## 5) Queue + Cron
### 5.1 FX diário
- [ ] Job `fetchExchangeRate` (cron Vercel)
- [ ] Tabela `exchange_rates`
- [ ] Persistir taxa usada no pedido

### 5.2 Outros jobs
- [ ] Opcional: limpeza de downloads expirados

**Referências**
- `src/jobs/fetch-fx.ts`
- `vercel.json`

---

## 6) RBAC (Admin)
### 6.1 Modelagem
- [x] Tabelas roles/permissions/pivots
- [x] Seed inicial (admin master, editor, suporte)

**Referências**
- `prisma/schema.prisma`
- `src/server/auth/rbac.ts`

### 6.2 Policies + "invisibilidade por nível"
- [x] Guards para ações sensíveis
- [x] Regra: só listar/editar usuários de `level <= meu_level`

**Referências**
- `src/server/auth/rbac.ts` — funções expandidas (getUserLevel, canManageUser, canAssignRole, etc.)
- `src/components/admin/AdminGuard.tsx` — guard de permissão para componentes
- `app/api/admin/check-permissions/route.ts` — API para verificar permissões
- `app/(admin)/*`

---

## 7) i18n (pt-BR/en-US) + seletor de idioma
- [ ] Middleware `Locale`
- [ ] Persistência (cookie + user preference)
- [ ] Traduções DB para catálogo/blog (`*_translations`)
- [ ] UI: seletor de idioma

**Referências**
- `middleware.ts`
- `src/i18n/*`

---

## 8) FX (BRL base + USD) — câmbio diário
### 8.1 Persistência e provider
- [ ] Tabela `exchange_rates`
- [ ] Service `exchange-rate-service`
- [ ] Job diário `fetchExchangeRate`

### 8.2 Uso no preço/pedido
- [ ] Converter BRL->USD para exibição
- [ ] Salvar `fx_rate_used` no pedido

**Referências**
- `src/server/fx/*`
- `app/(store)/checkout/*`

---

## 9) Catálogo (Categorias, Produtos, Variantes, Imagens)
- [ ] CRUD categorias (+ traduções)
- [ ] CRUD produtos (+ traduções)
- [ ] Variantes (preço BRL, estoque)
- [ ] Upload de imagens (bucket público)

**Referências**
- `src/server/catalog/*`
- `app/(admin)/catalog/*`

---

## 10) Carrinho
- [ ] `Cart` e `CartItem` por usuário
- [ ] Adicionar/remover/alterar qty
- [ ] Suportar `variant_id`
- [ ] Calcular subtotal BRL + USD exibido

**Referências**
- `src/server/pricing/cart-pricing-service.ts`
- `app/(store)/cart/*`

---

## 11) Cupons (não afeta frete)
- [ ] `coupons` + relações
- [ ] Tipos: percent / fixed
- [ ] Regras: validade, limites, subtotal mínimo
- [ ] Aplicação apenas em itens elegíveis; rateio e snapshot

**Referências**
- `src/server/pricing/coupon-service.ts`
- `src/server/pricing/order-total-calculator.ts`

---

## 12) Checkout multi-etapas + Orders
- [ ] Step 1: endereço (validação completa)
- [ ] Step 2: frete (Correios)
- [ ] Step 3: pagamento (PagSeguro)
- [ ] Step 4: revisão/confirmar
- [ ] Criar `Order` com `status=pending` e snapshots

**Referências**
- `app/(store)/checkout/*`
- `src/server/orders/*`

---

## 13) Shipping (Correios API direta)
- [ ] Client Correios
- [ ] Quote service (PAC/SEDEX etc.)
- [ ] Persistir serviço escolhido

**Referências**
- `src/server/shipping/*`

---

## 14) Payments (PagSeguro) + Webhooks (idempotente)
- [ ] Criar cobrança/checkout
- [ ] Salvar referência em `payments`
- [ ] Webhook `/api/webhooks/pagseguro` com assinatura/secret
- [ ] Atualizar `orders.status`; efeitos: estoque, entitlements, e-mails

**Referências**
- `src/server/payments/*`
- `app/api/webhooks/pagseguro/route.ts`

---

## 15) Estoque (baixa em `paid`)
- [ ] Ao marcar `paid`, decrementar estoque (variante/produto)
- [ ] Tratar estoque insuficiente (decidir comportamento)

**Referências**
- `src/server/orders/mark-order-paid.ts`
- `prisma/schema.prisma`

---

## 16) Digital delivery (storage privado + links assinados)
- [x] `digital_assets` com kind (file/link/license)
- [x] Entitlements criados em `paid`
- [x] Página "Meus Downloads"
- [ ] Download: auth + entitlement + signed URL + limite + logs

**Referências**
- `src/server/digital/*`
- `app/(store)/account/downloads/page.tsx` — página de downloads do usuário
- `app/api/account/downloads/route.ts` — API de listagem de entitlements
- `app/api/downloads/[entitlementId]/route.ts` — endpoint de download (a ser implementado)

---

## 17) Discord gating (produto/categoria)
- [ ] OAuth Discord (NextAuth provider)
- [ ] `discord_rules` por produto/categoria
- [ ] Checar gating no checkout e download
- [ ] UX com CTA “Conectar Discord”

**Referências**
- `src/server/discord/*`
- `app/(store)/account/discord/*`

---

## 18) Minha Conta
- [ ] Perfil (nome, senha, idioma, moeda)
- [ ] Pedidos (listagem + detalhe)
- [ ] Downloads
- [ ] Conectar/Desconectar Discord

**Referências**
- `app/(store)/account/*`

---

## 19) Blog + Comentários (moderação)
- [ ] `posts` + `post_translations`
- [ ] Admin: CRUD posts
- [ ] Loja: listagem + detalhe
- [ ] Comentários: criação na loja, moderação no admin

**Referências**
- `src/server/content/*`
- `app/(admin)/content/*`

---

## 20) LGPD
- [ ] Cookie consent (registrar versão)
- [ ] Exportação de dados (job + arquivo)
- [ ] Exclusão/anonimização (job/processo)
- [ ] Tela no “Minha Conta” para solicitar ações

**Referências**
- `src/jobs/*`
- `src/server/privacy/*`

---

## 21) Hardening / Qualidade
- [ ] Rate limiting (login, webhook, downloads)
- [ ] Logs/auditoria (webhooks, downloads, admin)
- [ ] Testes mínimos (pricing, webhook idempotente, download entitlement)

**Referências**
- `middleware.ts`
- `src/server/*`
- `__tests__/*`

---

## 22) Go-live checklist
- [ ] DNS e SSL ok (loja/admin)
- [ ] Env produção completo na Vercel
- [ ] Migrations aplicadas
- [ ] Cron FX funcionando
- [ ] Webhook PagSeguro configurado (prod)
- [ ] Storage privado validado (signed URLs)
- [ ] Teste de compra ponta-a-ponta (físico e digital)

---

Copilot is powered by AI, so mistakes are possible. Leave a comment via the 👍 👎 to share your feedback and help improve the experience.
