# nb-store — Roadmap (MVP, Next.js)

Data: **2025-12-18**  
Repo: **BlackCodePub/nb-store (variant Next.js)**  
Cadência: **8 sprints (1 semana cada)**  
Stack: Next.js 14 + TypeScript + Bootstrap + Prisma + MySQL (Vercel)

Este roadmap deriva das decisões do projeto:
- Loja/Admin em subdomínios com **sessões separadas**
- Checkout **multi-etapas**
- Pedido `pending` **não reserva** estoque; baixa em `paid`
- PagSeguro com parcelamento; **juros pagos pelo cliente**
- Cupons por produto/categoria; **não** afetam frete
- Digitais com storage privado + **links assinados**
- Idiomas pt-BR/en-US; moedas BRL base + USD via câmbio diário
- Discord gating por produto/categoria (guild + role)

---

## Visão geral por épicos
1. **Base & UI** (setup, layouts Bootstrap, auth, cron)
2. **Admin & Catálogo** (RBAC, produtos/categorias, traduções, variações, imagens)
3. **Carrinho & Checkout** (multi-etapas, cupons, frete)
4. **Orders & Payments** (PagSeguro + webhooks idempotentes)
5. **Digital delivery** (entitlements, downloads, logs)
6. **Discord gating** (checkout + downloads)
7. **Conteúdo** (blog + comentários moderados)
8. **LGPD + Hardening + Go-live**

---

## Sprint 1 — Fundação do projeto (Base + UI + Auth)
**Objetivo:** projeto Next.js rodando, UI base pronta e fluxos de conta funcionando.

Entregas:
- Next.js 14 configurado (App Router, TS, lint)
- Layouts base (Loja/Admin) com Bootstrap
- UI kit básico (Loja/Admin)
- Auth: cadastro/login/logout/recuperação + verificação (NextAuth + provider de e-mail)
- Documentação de cron (Vercel) e envs

Critérios de sucesso:
- App sobe local e em preview
- E-mails de verificação chegam
- Layout consistente nas páginas base

---

## Sprint 2 — RBAC + Catálogo base + i18n (pt/en)
**Objetivo:** admin operável para cadastrar catálogo com traduções; base de i18n pronta na loja.

Entregas:
- RBAC (roles/perms) com **níveis/hierarquia**
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
- Variantes com preço BRL e estoque (quando aplicável)
- Imagens de produto (upload + ordenação)
- Exibição de variantes na PDP
- Regras de estoque preparadas (baixa somente em `paid`)

Critérios de sucesso:
- Produto pode ter variantes; carrinho escolhe variante
- Upload de imagens funcionando com bucket público/privado

---

## Sprint 4 — Carrinho + Cupons + Checkout (estrutura)
**Objetivo:** usuário montar carrinho e iniciar checkout multi-etapas.

Entregas:
- Carrinho persistido por usuário
- Precificação do carrinho (subtotal, descontos, total)
- **Cupons restritos por produto/categoria** (não afeta frete)
- Checkout multi-etapas (skeleton)

Critérios de sucesso:
- Cupom aplica somente nos itens elegíveis
- Checkout navega pelas etapas com validação

---

## Sprint 5 — Correios + Orders (criação de pedido pending)
**Objetivo:** frete real e criação de pedido consistente.

Entregas:
- Integração Correios para cotação
- Checkout Step 2 completo (seleção de serviço)
- Modelos/tabelas de pedidos: `orders`, `order_items`, `order_addresses`, `order_shipments`
- Ao finalizar checkout, criar `Order` com `status=pending`
- Admin: listagem de pedidos + detalhe

Critérios de sucesso:
- Pedido `pending` criado com snapshots
- Frete não recebe desconto de cupom

---

## Sprint 6 — PagSeguro + Webhooks + e-mails transacionais
**Objetivo:** receber pagamento e atualizar status com segurança.

Entregas:
- Integração PagSeguro: cobrança/checkout com parcelamento
- Endpoint de webhook + handler (route handler)
- **Idempotência** (não duplicar efeitos)
- Transições: `pending` -> `paid`; `pending` -> `canceled/failed`
- E-mails transacionais: confirmação pago, falha/cancelamento

Critérios de sucesso:
- Webhook aprovado marca pedido `paid` de forma idempotente
- Estoque baixa somente em `paid`

---

## Sprint 7 — Digital delivery + Discord gating + Minha Conta (Downloads)
**Objetivo:** entrega digital segura e controle de acesso via Discord.

Entregas:
- Digital assets por produto/variante (file/link/license) em bucket privado
- Entitlements gerados em `paid`
- Downloads: signed URL, limites, expiração, logs
- Integração Discord: OAuth “Conectar Discord”; regras por produto/categoria; checar checkout/download
- Minha Conta: pedidos, downloads, conectar Discord, preferências

Critérios de sucesso:
- Cliente baixa digitais com segurança
- Gating bloqueia corretamente quando necessário

---

## Sprint 8 — Blog + LGPD + Hardening + Go-live
**Objetivo:** fechar MVP com conteúdo, conformidade e checklist de produção.

Entregas:
- Blog (posts traduzidos) + comentários moderados
- LGPD: banner/registro de consentimento, exportação, exclusão/anonimização
- Hardening: rate limiting, logs/auditoria mínima no admin, revisão de validações
- Checklist go-live (Vercel + DNS + SSL + webhooks)

Critérios de sucesso:
- MVP pronto para produção com segurança básica e conformidade mínima

---

## Dependências e risco (resumo)
- **Serverless**: cuidado com tempo de execução e deps nativas.
- **Webhooks**: idempotência crítica (financeiro).
- **Sem reserva de estoque**: risco de oversell (aceito no MVP).
- **Discord API**: intermitência; UX clara.

---

## Pós-MVP (ideias)
- Reserva de estoque em `pending` com expiração
- Fila dedicada (BullMQ/Redis) para jobs
- Storage otimizado (Cloudflare R2 + CDN)
- Busca avançada (Meilisearch/Algolia)
- CI/CD com testes e preview automáticos

---

## Referências
- `PROJECT_BLUEPRINT.md`
- `ARCHITECTURE.md`
- `CONFIGURATION.md`
- `DIAGRAMS.md`
- `GUIDELINES.md`
- `TASKS.md`
