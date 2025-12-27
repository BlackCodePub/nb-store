# nb-store — Estrutura Recomendada de Arquivos (MVP, Next.js)

Data: **2025-12-18**  
Projeto: **nb-store (Next.js)**  
Stack: **Next.js 14 + TypeScript + Bootstrap + Prisma + MySQL**  
Hospedagem: **Vercel** | Storage: **S3/R2 privado**

Este documento descreve uma **estrutura de arquivos recomendada** (pastas, nomes e organização) para o MVP Next.js.

---

## 1) Raiz do repositório

```
.
├── app/
├── src/
├── prisma/
├── public/
├── docs/
├── package.json
├── pnpm-lock.yaml
├── next.config.js
├── tsconfig.json
├── vercel.json
├── README.md
└── copilot-instructions.md
```

### Regras
- `README.md` na raiz (visão geral e quickstart).
- Documentação detalhada em **`docs/`**.
- Instruções do Copilot em `copilot-instructions.md`.

---

## 2) Documentação (`docs/`)

```
docs/
├── README.md
├── ARCHITECTURE.md
├── CONFIGURATION.md
├── DIAGRAMS.md
├── GUIDELINES.md
├── PROJECT_BLUEPRINT.md
├── ROADMAP.md
├── STRUCTURE.md
├── TASKS.md
├── USAGE.md
├── DEPLOYMENT.md
├── TROUBLESHOOTING.md
├── SECURITY_GUIDE.md
└── THREAT_MODEL.md
```

---

## 3) App Router (rotas)

```
app/
├── (store)/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── catalog/
│   ├── cart/
│   ├── checkout/
│   ├── account/
│   └── blog/
├── (admin)/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── catalog/
│   ├── sales/
│   ├── marketing/
│   ├── digital/
│   ├── discord/
│   ├── content/
│   └── security/
└── api/
    ├── webhooks/
    │   └── pagseguro/route.ts
    ├── auth/[...nextauth]/route.ts
    ├── cron/
    │   └── fetch-fx/route.ts
    └── uploads/route.ts (se precisar)
```

---

## 4) Server modules e serviços

```
src/server/
├── db/
│   └── client.ts
├── payments/
│   ├── pagseguro-client.ts
│   ├── pagseguro-webhook-handler.ts
│   └── payment-status-mapper.ts
├── shipping/
│   ├── correios-client.ts
│   └── shipping-quote-service.ts
├── discord/
│   ├── discord-client.ts
│   └── discord-gate-service.ts
├── pricing/
│   ├── cart-pricing-service.ts
│   ├── coupon-service.ts
│   └── order-total-calculator.ts
├── fx/
│   ├── exchange-rate-client.ts
│   └── exchange-rate-service.ts
├── digital/
│   ├── digital-delivery-service.ts
│   └── download-policy-service.ts
├── auth/
│   ├── rbac.ts
│   └── session.ts
└── validation/
    └── schemas.ts
```

**Regras**
- Lógica sensível sempre em server modules.
- Route handlers e server actions apenas orquestram e validam input.

---

## 5) UI / Componentes

```
src/components/
├── ui/ (Bootstrap-based components)
├── store/
└── admin/
```

---

## 6) Prisma

```
prisma/
├── schema.prisma
└── migrations/
```

- Migrations versionadas e aplicadas com `prisma migrate deploy` em produção.

---

## 7) Tests

```
__tests__/
├── unit/
│   ├── pricing/
│   └── fx/
└── integration/
    ├── api/
    └── webhooks/
```

---

## 8) Storage
- Bucket privado: `digital/*` (signed URLs, nunca público)
- Bucket público: imagens de produto

---

## 9) Qualidade
- Código comentado (arquivo + funções) em pt-BR.
- Validação com zod em toda entrada.
- Webhooks idempotentes.
- Downloads protegidos.
- Dependências atualizadas e estáveis.
