# nb-store — AGENTS (Guia para Agentes/IA e Automação)

Idioma de comunicação: **Português Brasileiro (pt-BR)**  
Data: **2025-12-18**  
Repo: **BlackCodePub/nb-store (variant Next.js)**  
Stack: **Next.js 14 (App Router) + TypeScript + Bootstrap + Prisma + MySQL**  
Ambiente alvo: **Vercel (ou similar) + S3/R2 privado para digitais**

Este documento define como **agentes automatizados (IA), assistentes e automações** devem trabalhar nesta base Next.js: padrões de comunicação, segurança, boas práticas, convenções e “contratos” do MVP.

> Regra principal: **priorize segurança e consistência acima de velocidade**.  
> Regra secundária: **use bibliotecas atualizadas, na versão mais recente estável e recomendada** (evitar libs abandonadas).

---

## 1) Comunicação (pt-BR) e estilo
- Escreva sempre em **Português Brasileiro**, claro e direto.
- Evite gírias; use termos técnicos corretos.
- Ao propor mudanças, inclua:
  - **O que muda**
  - **Por que muda**
  - **Impacto**
  - **Como testar**
  - **Riscos e mitigação**
- Declare suposições explicitamente.

---

## 2) “Contratos” do MVP (não negociar sem decisão explícita)
1. **Next.js 14 (App Router) + TypeScript**
2. Loja e Admin em subdomínios com **sessões separadas** (cookies isolados)
3. Checkout **multi-etapas**
4. Sem guest checkout (**usuário precisa estar logado**) via NextAuth
5. Estoque: pedido `pending` **não reserva**, baixa apenas em `paid`
6. PagSeguro: parcelamento habilitado; **juros pagos pelo cliente**
7. Cupons por produto/categoria; **não** afetam frete
8. Digitais: storage **privado** (S3/R2) com **links assinados**
9. Idiomas: pt-BR + en-US
10. Moedas: BRL base + USD via API + cron diário
11. Discord gating por produto/categoria (guild + role)
12. SMTP/Email transacional via provider (ex.: Resend/SendGrid) — não logar secrets

---

## 3) Regra obrigatória: documentação na pasta `docs/`
- Toda documentação do projeto (exceto o `README.md` na raiz) deve ficar em **`docs/`**.
- Manter índice em `docs/README.md` apontando para todas as seções.

---

## 4) Código sempre comentado (por arquivo e por função)
**Obrigatório para qualquer contribuição:**
- Arquivo novo: cabeçalho curto com propósito, onde é usado (rota/component/server action) e pontos de segurança.
- Classe/função nova: comentário explicando o que faz, entradas/saídas, efeitos colaterais (DB, queue, e-mail, storage), uso típico e guardas de segurança.
- Comentários em **pt-BR**.

### 4.1 Padrão sugerido (TypeScript JSDoc)
```ts
/**
 * applyCoupon
 *
 * Valida e aplica cupom no carrinho persistido do usuário.
 * - Uso: chamada por server action de checkout.
 * - Segurança: valida elegibilidade por item e não altera frete.
 */
export async function applyCoupon(params: ApplyCouponInput): Promise<CartPricingResult> {
  // ...
}
```

---

## 5) Dependências e bibliotecas (regras)
### 5.1 Versões e atualização
- Preferir **última versão estável** e libs ativas.
- Verificar compatibilidade com Next.js 14 / Node 18+ / Prisma.

### 5.2 Evitar dependências desnecessárias
- Não adicionar libs que o Next/React já resolvem nativamente.
- Avaliar impacto em bundle e Edge/Server runtimes.

---

## 6) Segurança (prioridade máxima)
- Validar input com **zod** ou schema similar em server actions e route handlers.
- Nunca confiar em dados do cliente; revalidar no servidor.
- Não logar tokens, secrets ou PII em texto puro.
- Webhooks PagSeguro: assinatura/secret + idempotência por `provider_reference` + lock lógico (row-level ou advisory) no DB.
- Downloads digitais: auth + entitlement + signed URL + throttle.
- Rate limiting em login, webhooks, downloads (usar middleware/edge limiter).

---

## 7) Comentários sobre operações
- Deploy com `pnpm build` e runtimes serverless; evitar dependências nativas pesadas.
- Jobs/cron via Vercel Cron (ou equivalente) para FX diário e tarefas de manutenção.
- Background intenso: use fila (ex.: Upstash Redis + BullMQ) e documente.

---

## 8) Checklist obrigatório antes de “finalizar” uma entrega
- [ ] Documentação em `docs/` atualizada e indexada
- [ ] Código comentado em pt-BR
- [ ] Validação de input (zod) em server actions/APIs
- [ ] Auth + policies/guards aplicadas
- [ ] Rate limiting (login/webhook/download) configurado
- [ ] Logs sem secrets; storage privado para digitais
- [ ] Transações/locks nos pontos críticos (payments/stock)
- [ ] Idempotência em webhooks e jobs reentrantes
- [ ] Compatibilidade com Next 14 e bundle saudável

---

## 9) Referências internas do repo
- `README.md` — visão geral e setup
- `ARCHITECTURE.md` — decisões arquiteturais
- `CONFIGURATION.md` — variáveis `.env`, cron, integrações
- `DIAGRAMS.md` — fluxos e diagramas
- `GUIDELINES.md` — convenções de contribuição e código
- `ROADMAP.md` — roadmap em sprints
- `TASKS.md` — tarefas detalhadas
- `USAGE.md` — como usar (loja/admin)

Copilot is powered by AI, so mistakes are possible. Leave a comment via the 👍 👎 to share your feedback and help improve the experience.
