# Instruções do GitHub Copilot — nb-store (Next.js)

Idioma obrigatório: **Português Brasileiro (pt-BR)**  
Stack: **Next.js 14 (App Router) + TypeScript + Bootstrap + Prisma + MySQL**  
Hospedagem alvo: **Vercel (ou similar)**  
Data: **2025-12-18**

Este arquivo define **como o GitHub Copilot deve atuar** nesta base Next.js: comunicação, padrões de código, organização, segurança e critérios de qualidade.

> Prioridade #1: **Segurança e consistência**  
> Prioridade #2: **Boas práticas e código sustentável**  
> Prioridade #3: **Velocidade** (apenas quando não comprometer #1 e #2)

---

## 1) Comunicação (pt-BR)
- Responder e escrever documentação, comentários e mensagens de commit/PR em **Português Brasileiro**.
- Ser objetivo e técnico.
- Declarar suposições e trade-offs.
- Ao propor mudanças, incluir: o que muda, por que muda, impacto, como testar, riscos e mitigação.

---

## 2) “Contratos” do MVP (não alterar sem decisão explícita)
1. Next.js 14 (App Router) + TypeScript
2. Bootstrap como base de estilo (sem Tailwind)
3. Loja e Admin em subdomínios com **sessões separadas**
4. Checkout **multi-etapas**
5. Sem guest checkout (NextAuth obrigatório)
6. Estoque: `pending` **não reserva**, baixa apenas em `paid`
7. PagSeguro: parcelamento habilitado; **juros pagos pelo cliente**
8. Cupons por produto/categoria; **não** afetam frete
9. Digitais: storage privado (S3/R2) com **links assinados**
10. Idiomas: pt-BR + en-US
11. Moedas: BRL base + USD via câmbio diário
12. Discord gating por produto/categoria (guild + role)

---

## 3) Documentação obrigatória em `docs/`
- Toda documentação (exceto `README.md`) fica em `docs/`.
- Índice em `docs/README.md` com links e descrições.
- Atualize a doc sempre que alterar env/cron/webhooks/fluxos.

---

## 4) Código sempre comentado (arquivo + função)
- Arquivo novo: cabeçalho com propósito, uso, riscos de segurança.
- Função/método: explicar o que faz, inputs/outputs, efeitos colaterais, guardas.
- Comentários em pt-BR.

---

## 5) Boas práticas (padrão de arquitetura)
- Separar camadas: UI (app router + componentes) vs server (route handlers/server actions).
- Validação com zod no servidor; nunca confiar em dados do cliente.
- Prisma para persistência; use transações para pagamentos/estoque/downloads.
- Auth via NextAuth; RBAC aplicado em server actions e UI (Feature Flags/guards).
- Jobs e webhooks idempotentes.

---

## 6) Dependências
- Preferir libs oficiais e mantidas (NextAuth, Prisma, zod, date-fns, react-hook-form).
- Evitar dependências grandes que aumentem bundle; prefira componentes Bootstrap leves.

---

## 7) Segurança
- Rate limiting em login, webhooks, downloads.
- Assinatura/secret em webhooks PagSeguro; idempotência por `provider_reference`.
- Downloads: auth + entitlement + signed URL + throttle.
- Logs sem tokens ou dados sensíveis.

---

## 8) Regras de negócio essenciais
- Sem guest checkout.
- Cupom não afeta frete.
- Estoque baixa somente em `paid`.
- BRL base; USD por câmbio diário; salvar `fx_rate_used` no pedido.
- Discord gating checado no checkout e no download.

---

## 9) Operação
- Vercel Cron para jobs (FX diário, housekeeping).
- Webhook PagSeguro em `/api/webhooks/pagseguro` (route handler) com proteção e idempotência.
- Storage privado (S3/R2) com URLs assinadas.

---

## 10) Checklist obrigatório
- [ ] Código comentado (arquivo + funções) em pt-BR
- [ ] Validação server-side com zod
- [ ] Auth + RBAC aplicados
- [ ] Rate limiting em rotas sensíveis
- [ ] Idempotência em webhooks/jobs
- [ ] Docs atualizadas em `docs/` e indexadas
- [ ] Sem vazamento de secrets em logs

---
