# nb-store — Diagramas (MVP, Next.js)

Data: **2025-12-18**  
Projeto: **nb-store (Next.js)**  
Stack: **Next.js 14 + TypeScript + Bootstrap + Prisma + MySQL** (Vercel; storage S3/R2; route handlers; cron via Vercel)

Domínios:
- Produção: Loja `https://nobugs.com.br` | Admin `https://admin.nobugs.com.br` | API opcional `https://api.nobugs.com.br`
- Dev: Loja `http://localhost:3000` | Admin `http://admin.localhost:3000`

Decisões-chave:
- **Sessões separadas** (loja vs admin)
- Checkout multi-etapas
- Estoque: `pending` **não reserva**, baixa somente em `paid`
- Cupons por produto/categoria, **não** afetam frete
- PagSeguro com parcelamento; **juros pagos pelo cliente**
- Digital: assets privados (S3/R2) com **links assinados**
- Idiomas: pt-BR/en-US; Moedas: BRL base + USD conversão diária
- Discord gating por produto/categoria (guild + role)

---

## 1) Context Diagram (C4 — Nível 1)

```mermaid
flowchart LR
  U[Cliente / Usuário] -->|Navega, compra, baixa digitais| STORE[Loja (Next.js)]
  A[Administrador] -->|Gerencia catálogo, pedidos, conteúdo| ADMIN[Admin (Next.js)]

  STORE -->|Checkout/Payment| PAG[PagSeguro]
  PAG -->|Webhook (status pagamento)| API[/api/webhooks/pagseguro]

  STORE -->|Cotação frete| COR[Correios API]
  STORE -->|OAuth / verificação de guild/role| DIS[Discord API]

  STORE --> DB[(MySQL/Postgres via Prisma)]
  ADMIN --> DB

  STORE --> FS[(Storage privado S3/R2)]
  ADMIN --> FS

  STORE --> MAIL[Email Provider]
  ADMIN --> MAIL
```

---

## 2) Containers (C4 — Nível 2)

```mermaid
flowchart TB
  subgraph NEXT[Next.js 14 (App Router)]
    STOREWEB[Store Web (React/SSR/ISR)
    Segmento: app/(store)]
    ADMINWEB[Admin Web (React/SSR)
    Segmento: app/(admin)]
    API[Route Handlers /api/*
    webhooks, auth, APIs]
    JOBS[Cron/Workers
    (Vercel Cron + fila opcional)]
    SERVICES[Server Modules
    Payments/Shipping/Discord/Pricing/FX]
    DBLAYER[Prisma Client]
  end

  STOREWEB --> SERVICES
  ADMINWEB --> SERVICES
  API --> SERVICES
  SERVICES --> DB[(MySQL/Postgres)]
  SERVICES --> FS[(S3/R2)]
  SERVICES --> PAG[PagSeguro]
  SERVICES --> COR[Correios API]
  SERVICES --> DIS[Discord API]
  SERVICES --> MAIL[Email Provider]
```

Notas:
- Store/Admin compartilham código, separados por segmentos/hosts.
- Lógica sensível reside em server modules/route handlers (não no client).

---

## 3) Fluxo de Checkout (multi-etapas)

```mermaid
sequenceDiagram
  autonumber
  participant U as Usuário (logado)
  participant S as Store (Next.js)
  participant C as Correios
  participant P as PagSeguro
  participant W as Webhook PagSeguro
  participant DB as DB

  U->>S: Step 1 - informa endereço
  S->>DB: salva estado do checkout (server action)

  U->>S: Step 2 - solicita frete
  S->>C: cotar(cep, itens, dimensões/peso)
  C-->>S: opções de serviço + preço + prazo
  U->>S: seleciona serviço
  S->>DB: persiste seleção de frete

  U->>S: Step 3 - pagamento
  S->>DB: cria Order (status=pending) + snapshots
  S->>P: cria cobrança/checkout (parcelamento)
  P-->>U: redireciona/exibe pagamento

  P-->>W: envia webhook (paid/canceled/...)
  W->>S: POST /api/webhooks/pagseguro
  S->>DB: registra Payment + atualiza Order.status

  alt pagamento aprovado
    S->>DB: Order.status = paid
    S->>DB: baixa estoque
    S->>DB: cria entitlements digitais
    S->>U: e-mail + acesso a downloads
  else pagamento não aprovado/cancelado
    S->>DB: Order.status = canceled/failed
    S->>U: informa falha/cancelamento
  end
```

---

## 4) Máquina de Estados do Pedido

```mermaid
stateDiagram-v2
  [*] --> pending: cria pedido (checkout)
  pending --> paid: webhook PagSeguro aprovado
  pending --> canceled: webhook cancelado/expirado
  pending --> failed: erro/falha pagamento (opcional)

  paid --> refunded: reembolso (opcional)
  canceled --> [*]
  failed --> [*]
  refunded --> [*]
```

Regras:
- `pending`: **não** baixa estoque
- `paid`: baixa estoque e libera digitais

---

## 5) Cupom — cálculo

```mermaid
sequenceDiagram
  autonumber
  participant U as Usuário
  participant S as Store (Cart)
  participant DB as Prisma/DB

  U->>S: informa código do cupom
  S->>DB: buscar coupon + validar (ativo, datas, limites)
  S->>DB: obter itens do carrinho
  S->>S: separar itens elegíveis x não elegíveis
  S->>S: calcular desconto (percent/fixed) somente nos elegíveis
  S-->>U: retorna totais (subtotal, desconto, frete, total)

  Note over S: Cupom NÃO afeta frete
```

---

## 6) Entrega Digital (Entitlements + Downloads)

```mermaid
sequenceDiagram
  autonumber
  participant U as Usuário
  participant S as Store
  participant DB as DB
  participant FS as S3/R2

  U->>S: acessa "Meus Downloads"
  S->>DB: listar entitlements do usuário
  S-->>U: exibe itens disponíveis

  U->>S: solicita download (signed URL)
  S->>DB: valida entitlement (expires, max_downloads)
  S->>DB: incrementa downloads_count + log
  S->>FS: gerar signed URL
  FS-->>U: download
```

---

## 7) Discord Gating — checagem

```mermaid
flowchart LR
  U[Usuário] --> OAUTH[Conectar Discord (OAuth)]
  OAUTH --> SA[(social_accounts)]
  U --> CHECK[Checagem de gating]
  CHECK -->|sem conta Discord| BLOCK[Bloqueia\npedir para conectar]
  CHECK -->|com conta| DIS[Discord API]
  DIS -->|membro + role ok| OK[Permitir compra/download]
  DIS -->|falha| BLOCK2[Bloquear\nmostrar instrução]
```

---

## 8) RBAC + Níveis (Admin)

```mermaid
flowchart TB
  A[Admin User] --> UR[user_role]
  UR --> R[roles\n(level, is_admin)]
  R --> RP[role_permission]
  RP --> P[permissions]

  A --> POL[Guards/Policies]
  POL -->|valida permission + level| ALLOW[Permite ação]
  POL -->|nega| DENY[403]
```

“Invisibilidade”: usuário só lista/edita usuários com `level <= meu_level`.

---

## 9) Multi-idioma e Multi-moeda (pt-BR/en-US, BRL/USD)

```mermaid
flowchart TB
  REQ[Request] --> LOC[Middleware Locale]
  LOC --> CUR[Currency Resolver]
  CUR --> VIEW[UI]
  VIEW --> FX[Exchange Rate]
  FX --> DB[(exchange_rates)]
  JOB[FetchExchangeRateJob (diário)] --> FXAPI[FX Provider API]
  FXAPI --> DB
```

Moeda:
- Preço base: BRL
- USD exibido por conversão usando taxa diária; salvar `fx_rate_used` no pedido.

---

## 10) Webhooks PagSeguro — idempotência

```mermaid
flowchart TB
  IN[POST /api/webhooks/pagseguro] --> PARSE[Validar assinatura + payload]
  PARSE --> FIND[Buscar Payment por provider_reference]
  FIND -->|existe e status já aplicado| STOP[No-op (idempotente)]
  FIND -->|novo| SAVE[Salvar Payment payload]
  SAVE --> UPDATE[Atualizar Order.status]
  UPDATE --> EFFECTS[Efeitos: baixa estoque, entitlements, e-mails]
```

---

## 11) ER (núcleo MVP)

```mermaid
erDiagram
  USERS ||--o{ SOCIAL_ACCOUNTS : has
  USERS ||--o{ CARTS : owns
  CARTS ||--o{ CART_ITEMS : contains
  USERS ||--o{ ORDERS : places
  ORDERS ||--o{ ORDER_ITEMS : has
  ORDERS ||--o{ ORDER_ADDRESSES : ships_to
  ORDERS ||--o{ ORDER_SHIPMENTS : ships_via
  ORDERS ||--o{ PAYMENTS : paid_by

  PRODUCTS ||--o{ PRODUCT_VARIANTS : has
  PRODUCTS ||--o{ PRODUCT_IMAGES : has
  PRODUCTS ||--o{ PRODUCT_TRANSLATIONS : i18n
  CATEGORIES ||--o{ CATEGORY_TRANSLATIONS : i18n
  PRODUCTS }o--o{ CATEGORIES : categorized_as

  COUPONS ||--o{ COUPON_REDEMPTIONS : used_in
  COUPONS }o--o{ PRODUCTS : coupon_products
  COUPONS }o--o{ CATEGORIES : coupon_categories

  ORDER_ITEMS ||--o{ DIGITAL_ENTITLEMENTS : grants
  DIGITAL_ENTITLEMENTS ||--o{ DIGITAL_DOWNLOAD_LOGS : logs
  PRODUCTS ||--o{ DIGITAL_ASSETS : delivers

  POSTS ||--o{ POST_TRANSLATIONS : i18n
  POSTS ||--o{ COMMENTS : has

  EXCHANGE_RATES ||--|| EXCHANGE_RATES : daily_rate
```

---

## 12) Notas de implementação
- Checkout: server actions em `app/(store)/checkout/*` chamando serviços.
- Orders/Payments: `src/server/payments/*`, `app/api/webhooks/pagseguro/route.ts`.
- Shipping: `src/server/shipping/*`.
- Coupons/Pricing: `src/server/pricing/*`.
- Digital: `src/server/digital/*`, signed URLs do S3.
- Discord: `src/server/discord/*`.
- RBAC: `src/server/auth/rbac/*` + guards em server actions.
- i18n: `middleware.ts` + `next-intl`.
