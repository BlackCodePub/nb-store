# nb-store — Roadmap (MVP)

Data: **2025-12-16**  
Repo: **BlackCodePub/nb-store**  
Cadência: **8 sprints (1 semana cada)**  
Stack: Laravel 11 + Blade + Bootstrap + MySQL (Hostinger Shared)

Este roadmap foi derivado das decisões do projeto:
- Loja/Admin em subdomínios com **sessões separadas**
- Checkout **multi-etapas**
- Pedido `pending` **não reserva** estoque; baixa em `paid`
- PagSeguro com parcelamento; **juros pagos pelo cliente**
- Cupons por produto/categoria; **não** afetam frete
- Digitais com storage local + **links assinados**
- Idiomas pt-BR/en-US; moedas BRL base + USD via câmbio diário
- Discord gating por produto/categoria (guild + role)
- SMTP Hostinger; queue database + cron

---

## Visão geral por épicos
1. **Base & UI** (setup, layouts, auth, queue/cron, componentes)
2. **Admin & Catálogo** (RBAC, produtos/categorias, traduções, variações, imagens)
3. **Carrinho & Checkout** (multi-etapas, cupons, frete)
4. **Orders & Payments** (PagSeguro + webhooks idempotentes)
5. **Digital delivery** (entitlements, downloads, logs)
6. **Discord gating** (checkout + downloads)
7. **Conteúdo** (blog + comentários moderados)
8. **LGPD + Hardening + Go-live**

---

## Sprint 1 — Fundação do projeto (Base + UI + Auth)
**Objetivo:** projeto rodando, UI base pronta e fluxos de conta funcionando.

Entregas:
- Laravel 11 configurado (env + DB + padrões de locale/timezone)
- Layouts base (Loja/Admin) com Bootstrap
- UI kit básico (Loja/Admin)
- Autenticação: cadastro/login/logout/recuperação + verificação de e-mail (SMTP Hostinger)
- Queue (database) + documentação de cron/worker para Hostinger

Critérios de sucesso:
- App sobe local e em staging
- E-mails de verificação chegam
- Layout consistente nas páginas base

---

## Sprint 2 — RBAC + Catálogo base + i18n (pt/en)
**Objetivo:** admin operável para cadastrar catálogo com traduções; base de i18n pronta na loja.

Entregas:
- RBAC (roles/perms) com **níveis/hierarquia** (invisibilidade)
- CRUD de categorias + traduções
- CRUD de produtos + traduções (sem variantes avançadas ainda)
- Seletor de idioma (pt-BR/en-US) + persistência (cookie/user)
- Loja: páginas básicas (home, listagem por categoria, detalhe simples)

Critérios de sucesso:
- Admin consegue gerenciar produtos/categorias
- Loja já navega em pt/en

---

## Sprint 3 — Variações, imagens e estoque (catálogo completo)
**Objetivo:** catálogo pronto para venda real (com variantes e imagens).

Entregas:
- Variantes (product_variants) com preço BRL e estoque (quando aplicável)
- Imagens de produto (upload + ordenação)
- Exibição de variantes na PDP (Product Detail Page)
- Regras de estoque preparadas (baixa somente em `paid`)

Critérios de sucesso:
- Produto pode ter variantes; carrinho futuramente conseguirá escolher variante
- Upload de imagens funcionando com `storage:link`

---

## Sprint 4 — Carrinho + Cupons + Checkout (estrutura)
**Objetivo:** usuário montar carrinho e iniciar checkout multi-etapas.

Entregas:
- Carrinho (persistente por usuário)
- Precificação do carrinho (subtotal, descontos, total)
- **Cupons restritos por produto/categoria** (não afeta frete)
- Checkout multi-etapas (skeleton):
  - Step 1: endereço
  - Step 2: frete (placeholder)
  - Step 3: pagamento (placeholder)
  - Step 4: revisão (placeholder)

Critérios de sucesso:
- Cupom aplica somente nos itens elegíveis
- Checkout navega pelas etapas com validação

---

## Sprint 5 — Correios + Orders (criação de pedido pending)
**Objetivo:** frete real e criação de pedido consistente.

Entregas:
- Integração Correios (API direta) para cotação de serviços/preço/prazo
- Checkout Step 2 completo (seleção de serviço Correios)
- Modelos/tabelas de pedidos:
  - `orders`, `order_items`, `order_addresses`, `order_shipments`
- Ao finalizar checkout, criar `Order` com `status=pending`
- Admin: listagem de pedidos + detalhe

Critérios de sucesso:
- Pedido `pending` criado com snapshots (itens, preços, descontos)
- Frete não recebe desconto de cupom

---

## Sprint 6 — PagSeguro + Webhooks + e-mails transacionais
**Objetivo:** receber pagamento e atualizar status com segurança.

Entregas:
- Integração PagSeguro:
  - criação de cobrança/checkout com parcelamento
  - juros pagos pelo cliente (config do PagSeguro)
- Endpoint de webhook + handler
- **Idempotência** (não duplicar efeitos ao reprocessar webhook)
- Transições:
  - `pending` -> `paid` (principal)
  - `pending` -> `canceled/failed` (se aplicável)
- E-mails transacionais:
  - confirmação de pedido pago
  - falha/cancelamento (opcional)

Critérios de sucesso:
- Webhook aprovado marca pedido `paid` de forma idempotente
- Estoque baixa somente em `paid`

---

## Sprint 7 — Digital delivery + Discord gating + Minha Conta (Downloads)
**Objetivo:** entrega digital segura e controle de acesso via Discord.

Entregas:
- Digital assets por produto/variante (file/link/license)
- Entitlements gerados em `paid`
- Downloads:
  - rotas assinadas
  - limites de download
  - expiração (se adotada)
  - logs (ip, user-agent)
- Integração Discord:
  - OAuth “Conectar Discord”
  - regras por produto/categoria (guild + role)
  - checar gating no checkout e no download (recomendado)
- Minha Conta:
  - pedidos
  - downloads
  - conectar Discord
  - preferências (idioma/moeda)

Critérios de sucesso:
- Cliente consegue baixar digitais com segurança
- Gating bloqueia corretamente quando necessário

---

## Sprint 8 — Blog + LGPD + Hardening + Go-live
**Objetivo:** fechar MVP com conteúdo, conformidade e checklist de produção.

Entregas:
- Blog:
  - posts com tradução pt/en
  - página do post
- Comentários:
  - criação na loja
  - moderação no admin (pending/approved/rejected)
- LGPD:
  - banner/registro de consentimento de cookies
  - exportação de dados (job + download)
  - exclusão/anônimização (processo definido)
- Hardening:
  - rate limiting (login, webhooks, downloads)
  - logs/auditoria mínima no admin
  - revisão de validações e mensagens
- Checklist go-live (Hostinger + DNS + SSL + webhooks)

Critérios de sucesso:
- MVP pronto para produção com segurança básica e conformidade mínima

---

## Dependências e risco (resumo)
- **Hostinger Shared**: garantir cron/queue confiável (risco operacional).
- **Webhooks**: idempotência é crítica (risco financeiro).
- **Sem reserva de estoque**: risco de oversell (aceito no MVP).
- **Discord API**: intermitência deve ter fallback/mensagem UX clara.

---

## Pós-MVP (ideias para fase 2)
- Reserva de estoque em `pending` com expiração
- Storage externo (S3/Cloudflare R2)
- CI/CD e deploy atomizado (releases)
- Busca avançada (Meilisearch/Algolia)
- Cupons por variante / regras combinadas
- Relatórios e BI (receita, conversão, LTV)
- Multimoeda com mais pares e atualização intraday

---

## Referências
- `PROJECT_BLUEPRINT.md` — escopo completo e decisões
- `ARCHITECTURE.md` — arquitetura e organização
- `CONFIGURATION.md` — envs, cron, integrações
- `DIAGRAMS.md` — diagramas de fluxo e ER
- `GUIDELINES.md` — padrões de contribuição e regras de código

Copilot is powered by AI, so mistakes are possible. Leave a comment via the 👍 👎 to share your feedback and help improve the experience.