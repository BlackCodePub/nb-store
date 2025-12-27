# nb-store — Uso do Sistema (MVP, Next.js)

Data: **2025-12-18**  
Projeto: **nb-store (Next.js)**  
Stack: **Next.js 14 + TypeScript + Bootstrap + Prisma + MySQL**  
Domínios:
- Loja: `nobugs.com.br`
- Admin: `admin.nobugs.com.br`

Este documento descreve **como usar** o sistema no dia a dia (Loja e Admin) na variante Next.js.

---

## 1) Visão geral rápida
E-commerce com:
- produtos físicos e digitais
- checkout multi-etapas
- PagSeguro (parcelamento; juros do cliente)
- frete Correios
- entrega digital por links assinados com limites e logs
- Discord gating por produto/categoria
- multi-idioma (pt-BR/en-US) e multi-moeda (BRL/USD com câmbio diário)
- admin separado em subdomínio, com RBAC e níveis

**Importante:** Loja e Admin usam **sessões separadas** (cookies independentes por host).

---

## 2) Uso da Loja (Cliente)

### 2.1 Criar conta / Login (obrigatório)
Fluxo:
1. Acessar a loja
2. Criar conta (NextAuth credentials) ou login
3. Confirmar e-mail (obrigatório)
4. Após logado: adicionar ao carrinho, aplicar cupom, finalizar checkout, acessar pedidos e downloads

### 2.2 Navegar no catálogo
- Navegar por categorias, abrir produto, escolher variante
- Idioma: alternar pt-BR/en-US (persistência em cookie/conta)
- Moeda: alternar BRL/USD (exibição; pedido salva `fx_rate_used`)

### 2.3 Carrinho
- adicionar/remover itens, alterar quantidade, escolher variantes
- aplicar cupom (regras: elegibilidade por item, **não** afeta frete)

### 2.4 Checkout (multi-etapas)
1) Endereço  
2) Frete (Correios)  
3) Pagamento (PagSeguro)  
4) Revisão/Confirmação

- Ao confirmar, cria pedido `pending` (**não** baixa estoque)
- Estoque baixa quando webhook confirma `paid`

### 2.5 Produtos digitais
- Disponíveis após `paid`
- "Minha Conta → Downloads": gera signed URL curta
- Regras: auth, entitlement, limite de downloads, expiração opcional, logs

### 2.6 Discord gating
- Conectar Discord (OAuth) em "Minha Conta"
- Checagem no checkout e no download; se faltar guild/role → bloquear e mostrar instruções

---

## 3) Uso do Admin (Administrador)

### 3.1 Acesso
- `admin.nobugs.com.br`
- Sessão independente da loja (cookies separados)

### 3.2 RBAC
- Roles/perms + níveis (invisibilidade)
- Criar roles (admin, editor, suporte) e atribuir usuários

### 3.3 Catálogo
- Categorias (slug, hierarquia, traduções)
- Produtos (physical/digital, traduções, ativo/inativo)
- Variantes (preço BRL, estoque), imagens

### 3.4 Cupons
- Criar cupom (percent/fixed)
- Limitar por produto/categoria, datas, limites de uso
- Regra: cupom **não** desconta frete

### 3.5 Pedidos e Pagamentos
- Listar pedidos, ver detalhe
- Ver status do pagamento (PagSeguro)
- Ver payloads/logs essenciais (sanitizados)

### 3.6 Assets digitais
- Associar assets a produto/variante (arquivo/link/license)
- Garantir storage privado

### 3.7 Regras Discord
- Definir guild/role por produto/categoria
- Revisar bloqueios no checkout/download

### 3.8 Blog e Comentários
- Criar posts traduzidos
- Moderar comentários (`pending/approved/rejected`)

### 3.9 LGPD
- Registrar consentimento de cookies (loja)
- Solicitar export/delete (jobs)

---

## 4) Operação (Rotinas)

### 4.1 Verificações diárias
- falhas de jobs/cron (FX)
- webhooks PagSeguro (logs)
- atualização de câmbio
- erros de download digital

### 4.2 Antes de campanhas/vendas
- conferir Correios, PagSeguro (sandbox/prod), estoque, gating Discord

---

## 5) Perguntas frequentes (FAQ)

- **Por que preciso de conta para comprar?** Sem guest checkout para garantir histórico, downloads e Discord gating.
- **Por que o estoque não é reservado em pending?** Simplicidade do MVP; risco aceito de oversell.
- **Cupom não aplica no frete?** Correto, decisão do MVP.
- **De onde vem o preço em USD?** Conversão diária; pedido salva `fx_rate_used`.

---

## 6) Referências
- `README.md`
- `PROJECT_BLUEPRINT.md`
- `DIAGRAMS.md`
- `ARCHITECTURE.md`
- `CONFIGURATION.md`
- `GUIDELINES.md`
- `ROADMAP.md`
- `TASKS.md`
