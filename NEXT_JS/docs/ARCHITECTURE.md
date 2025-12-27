# nb-store — Arquitetura (MVP, Next.js)

Data: **2025-12-18**  
Repo: **BlackCodePub/nb-store (variant Next.js)**  
Stack: **Next.js 14 (App Router) + TypeScript + Bootstrap + Prisma + MySQL**  
Hospedagem: **Vercel (ou similar)** | Storage: **S3/R2 privado** | Auth: **NextAuth**

---

## 1) Objetivos arquiteturais
- Entregar um MVP robusto e simples de operar em ambiente serverless (Vercel).
- Separar claramente **Loja** e **Admin** (UX e segurança) por hosts/segmentos.
- Garantir integridade de pedidos/pagamentos com **webhooks + idempotência**.
- Entrega digital segura (URLs assinadas + logs + limites).
- Suportar evolução pós-MVP (API, storage externo, filas dedicadas).

---

## 2) Decisões e constraints (congeladas)
- **Next.js 14 (App Router) + TypeScript**
- Loja e Admin em subdomínios distintos com **sessões separadas**
- Checkout **multi-etapas**
- Sem guest checkout (**usuário deve estar logado** via NextAuth)
- Estoque: `pending` **não reserva**; baixa somente em `paid`
- PagSeguro com parcelamento; **juros pagos pelo cliente**
- Cupons restritos por produto/categoria; **não** descontam frete
- Arquivos digitais **privados** (S3/R2) com **links assinados**
- Idiomas: **pt-BR / en-US**
- Moedas: **BRL base + USD** com câmbio por **API + cron diário**
- Discord gating por produto/categoria (guild + role)

---

## 3) Visão geral do sistema
O projeto é um **monólito Next.js (App Router)** com separação lógica por segmentos/hosts:
- **Store Web (Loja)**: `app/(store)/*`
- **Admin Web**: `app/(admin)/*`
- **APIs e webhooks**: `app/api/*` (route handlers)
- **Jobs/Cron**: endpoints dedicados + workers (fila opcional)

Prisma provê acesso ao MySQL/Postgres compartilhado por Loja e Admin.

---

## 4) Topologia de deploy (Vercel)
### 4.1 Considerações
- Serverless/edge runtimes: evitar dependências nativas pesadas.
- Cron via Vercel Cron para tasks diárias.
- Webhooks em route handlers com idempotência.

### 4.2 Estratégia recomendada
- Deploy automático a cada merge em `main`.
- `DATABASE_URL` aponta para DB gerenciado.
- Storage S3/R2 privado para digitais; público (imagens) pode ser outro bucket/CDN.

---

## 5) Separação Loja vs Admin (sessões e segurança)
### 5.1 Sessões separadas
- Cookies distintos por host usando NextAuth options.
- Middleware pode reforçar cookie name baseado no host.

### 5.2 Rotas e middlewares
- Loja: `app/(store)/*` com layouts próprios.
- Admin: `app/(admin)/*` com guard server-side (NextAuth + RBAC).
- API: `app/api/*` com validação e rate limiting.

### 5.3 Estrutura de componentes e serviços
- Componentes Store/Admin separados em `src/components`.
- Serviços de domínio em `src/server/*` (pricing, payments, shipping, discord, fx).

---

## 6) Domínios de negócio (Bounded Contexts “soft”)
> Organização para manter o código sustentável.

- **Catálogo**: produtos, categorias, variações, traduções.
- **Carrinho e Precificação**: carrinho persistido por usuário, cupons, FX.
- **Checkout & Orders**: fluxo multi-etapas, criação de pedido `pending` com snapshots.
- **Payments (PagSeguro)**: criação de cobrança, webhooks idempotentes.
- **Shipping (Correios)**: cotação e seleção de serviços.
- **Digital Delivery**: assets privados, entitlements, downloads assinados.
- **Discord Gating**: regras por produto/categoria, verificação em checkout/download.
- **Conteúdo (Blog/Comentários)**: posts e comentários moderados.
- **LGPD**: consentimento, export, exclusão.

---

## 7) Consistência e transações
- Estados do pedido: `pending`, `paid`, `canceled`, `failed`, `refunded` (opcional).
- Estoque baixa apenas em `paid` dentro de transação.
- Idempotência em webhooks PagSeguro: `provider_reference` único + lock lógico.

---

## 8) Segurança
- Auth obrigatória para checkout/download.
- Rate limits em login/reset, webhooks e downloads.
- Downloads: signed URLs curtas + entitlement + ownership.
- Admin: RBAC com níveis/hierarquia.

---

## 9) i18n e moedas
- i18n via `next-intl` ou similar; persistência em cookie e preferências do usuário.
- Preço base BRL; USD por conversão diária armazenada em DB; salvar `fx_rate_used` no pedido.

---

## 10) Observabilidade e auditoria
- Logs estruturados no servidor (não no client).
- Logs para webhooks, downloads, ações administrativas sensíveis.
- Métricas básicas via provider (LogDrain/Observability).

---

## 11) Guidelines de código (recomendação)
- Serviços em `src/server/*` isolam integrações/lógica.
- Server actions/route handlers finos chamam serviços.
- Componentes client-side apenas para UI; lógica sensível no servidor.
- Prisma migrations versionadas; use `prisma migrate deploy` em produção.

---

## 12) Pontos de atenção do MVP
1. **Serverless**: evitar libs nativas e operações longas.
2. **Webhooks**: idempotência obrigatória.
3. **Storage privado**: nunca expor assets digitais publicamente.
4. **Oversell**: sem reserva em `pending`, risco aceito.
5. **Discord**: tokens/refresh; UX clara em falhas.

---

## 13) Referências
- `README.md`
- `PROJECT_BLUEPRINT.md`
- `CONFIGURATION.md`
- `DIAGRAMS.md`

---

## 14) Exemplos rápidos de handlers críticos
### 14.1 Webhook PagSeguro (`app/api/webhooks/pagseguro/route.ts`)
```ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/src/server/db/client';
import { verifyPagSeguroSignature } from '@/src/server/payments/pagseguro-client';
import { markOrderPaid } from '@/src/server/payments/mark-order-paid';

const payloadSchema = z.object({
	provider_reference: z.string(),
	status: z.string(),
	amount: z.number(),
});

export async function POST(req: Request) {
	const body = await req.json();
	const payload = payloadSchema.parse(body);

	// Assinatura/secret
	const ok = verifyPagSeguroSignature(req.headers, body, process.env.PAGSEGURO_WEBHOOK_SECRET!);
	if (!ok) return NextResponse.json({ error: 'invalid signature' }, { status: 401 });

	// Idempotência + lock lógico
	const result = await prisma.$transaction(async (tx) => {
		const existing = await tx.payment.findUnique({ where: { provider_reference: payload.provider_reference } });
		if (existing?.status === 'paid') return 'already-paid';

		const payment = await tx.payment.upsert({
			where: { provider_reference: payload.provider_reference },
			update: { status: payload.status, payload_json: payload },
			create: { provider: 'pagseguro', provider_reference: payload.provider_reference, status: payload.status, payload_json: payload },
		});

		if (payload.status === 'paid') {
			await markOrderPaid({ paymentId: payment.id, tx });
		}

		return 'processed';
	});

	return NextResponse.json({ ok: true, result });
}
```

### 14.2 Download digital com URL assinada (`app/api/downloads/[entitlementId]/route.ts`)
```ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/src/server/auth/options';
import { prisma } from '@/src/server/db/client';
import { buildSignedUrl } from '@/src/server/digital/signed-url';

export async function GET(_req: Request, { params }: { params: { entitlementId: string } }) {
	const session = await getServerSession(authOptions);
	if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

	const entitlement = await prisma.digitalEntitlement.findUnique({
		where: { id: params.entitlementId },
		include: { asset: true },
	});

	if (!entitlement || entitlement.userId !== session.user.id) {
		return NextResponse.json({ error: 'forbidden' }, { status: 403 });
	}

	// Limites e expiração
	if (entitlement.expiresAt && entitlement.expiresAt < new Date()) {
		return NextResponse.json({ error: 'expired' }, { status: 410 });
	}

	// Gera URL assinada curta
	const signedUrl = await buildSignedUrl({
		bucket: process.env.STORAGE_BUCKET_PRIVATE!,
		key: entitlement.asset.path,
		ttlSeconds: Number(process.env.STORAGE_SIGNED_URL_TTL_SECONDS ?? 300),
	});

	// Log + contador
	await prisma.$transaction(async (tx) => {
		await tx.digitalEntitlement.update({
			where: { id: entitlement.id },
			data: { downloadsCount: { increment: 1 } },
		});
		await tx.digitalDownloadLog.create({
			data: {
				entitlementId: entitlement.id,
				userId: session.user.id,
				ip: 'x-forwarded-for', // substituir por extração real do header
				userAgent: 'unknown',  // substituir por req.headers
			},
		});
	});

	return NextResponse.redirect(signedUrl);
}
```
