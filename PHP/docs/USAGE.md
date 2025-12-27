# nb-store — Uso do Sistema (MVP)

Data: **2025-12-16**  
Projeto: **nb-store (NoBugs Store)**  
Stack: **Laravel 11 + Blade + Bootstrap + MySQL**  
Domínios:
- Loja: `nobugs.com.br`
- Admin: `admin.nobugs.com.br`

Este documento descreve **como usar** o sistema no dia a dia (Loja e Admin), com base em tudo que foi decidido para o MVP.

---

## 1) Visão geral rápida
O nb-store é um e-commerce com:
- venda de **produtos físicos** e **produtos digitais**
- checkout **multi-etapas**
- pagamento via **PagSeguro** (parcelamento habilitado; **juros por conta do cliente**)
- frete via **Correios**
- entrega digital por **links assinados** com limites e logs
- gating via **Discord** (guild + role) por produto/categoria
- multi-idioma (pt-BR/en-US) e multi-moeda (BRL/USD com câmbio diário)
- admin separado em subdomínio, com RBAC e níveis

**Importante:** Loja e Admin usam **sessões separadas** (logins independentes por subdomínio).

---

## 2) Uso da Loja (Cliente)

### 2.1 Criar conta / Login (obrigatório para comprar)
No MVP, o cliente **precisa estar logado** para comprar.

Fluxos:
1. Acessar a loja
2. Criar conta (cadastro) ou fazer login
3. Confirmar e-mail (verificação obrigatória)
4. Após logado, é possível:
   - adicionar ao carrinho
   - aplicar cupom
   - finalizar checkout
   - acessar pedidos e downloads

> Se a conta não estiver verificada, o sistema deve impedir finalizar compra e/ou baixar digitais (recomendado).

---

### 2.2 Navegar no catálogo
O cliente pode:
- navegar por categorias
- abrir a página de um produto
- selecionar variações (quando houver)
- visualizar preço (BRL ou USD)

#### Idioma
- O cliente pode alternar entre **pt-BR** e **en-US**.
- A escolha deve persistir (cookie e/ou preferência na conta).

#### Moeda
- O cliente pode alternar entre **BRL** e **USD**.
- BRL é o preço base; USD é calculado por câmbio diário.
- Totais do pedido devem registrar a taxa usada (`fx_rate_used`) no momento do checkout.

---

### 2.3 Carrinho
No carrinho o cliente pode:
- adicionar/remover itens
- alterar quantidade
- escolher variantes (se aplicável)
- aplicar cupom

#### Cupom (regras)
- Pode ser global, por categoria ou por produto.
- O desconto se aplica apenas nos itens elegíveis.
- **Não aplica desconto no frete**.
- Em carrinho misto (itens elegíveis + não elegíveis), o desconto não afeta os não elegíveis.

---

### 2.4 Checkout (multi-etapas)
O checkout do MVP é multi-etapas, sugerido como:

1) **Endereço**  
2) **Frete (Correios)**  
3) **Pagamento (PagSeguro)**  
4) **Revisão/Confirmação**

#### 2.4.1 Endereço
O cliente informa:
- CEP
- rua, número, complemento (opcional)
- bairro, cidade, estado
- país (no MVP provavelmente Brasil)

#### 2.4.2 Frete (Correios)
O sistema:
- consulta serviços no Correios
- exibe opções com preço e prazo
- salva a opção escolhida no checkout

> Cupom **não** altera o valor do frete.

#### 2.4.3 Pagamento (PagSeguro)
O cliente paga via PagSeguro e pode escolher parcelamento.

- Parcelamento **ativado**
- **Juros do parcelamento pagos pelo cliente** (o valor final varia por parcelas)

#### 2.4.4 Pedido `pending`
Ao confirmar checkout, o sistema cria um pedido com status:
- `pending` (aguardando pagamento)

Regra crítica:
- `pending` **não reserva estoque**

O estoque só é baixado quando o pagamento for confirmado (`paid`).

---

### 2.5 Status do pedido
Estados principais no MVP:
- `pending`: aguardando pagamento (não baixa estoque)
- `paid`: pago (baixa estoque e libera digitais)
- `canceled` / `failed`: não pago/cancelado

O cliente pode acompanhar na seção **Minha Conta → Pedidos**.

---

### 2.6 Produtos digitais: como baixar
Quando o pedido fica `paid`, o cliente ganha acesso aos itens digitais.

A experiência típica:
1. Acessar **Minha Conta → Downloads**
2. Ver a lista de itens disponíveis
3. Clicar em “Baixar”

Regras de segurança do download:
- exige login
- rota de download é **assinada**
- há limites (ex.: `max_downloads`)
- pode haver expiração (`expires_at`)
- downloads são logados (IP + user-agent)

Arquivos digitais ficam no servidor, em `storage/app` (não expostos diretamente em `/public`).

---

### 2.7 Discord gating (acesso por guild/role)
Alguns produtos/categorias exigem que o cliente:
- conecte a conta Discord
- seja membro de uma guild
- possua uma role específica

Fluxo do cliente:
1. Ir em **Minha Conta → Conectar Discord**
2. Autorizar via OAuth
3. Voltar para a loja e tentar comprar/baixar novamente

Recomendação do MVP:
- checar gating **no checkout**
- checar gating **no download** (defesa em profundidade)

Se não cumprir:
- o sistema bloqueia e mostra instruções para conectar/entrar na guild/obter role.

---

## 3) Uso do Admin (Administrador)

### 3.1 Acesso ao Admin
Acessar `admin.nobugs.com.br` e logar.

**Importante:** login do admin não compartilha sessão com a loja (subdomínios diferentes).

---

### 3.2 RBAC (Roles/Permissões/Níveis)
No MVP, o admin possui:
- roles e permissões para controlar acesso
- níveis/hierarquia (ex.: nível maior consegue gerenciar níveis menores)
- regra de “invisibilidade”: usuários de nível menor não podem ver/editar admins com nível maior

Uso prático:
- criar roles (ex.: `admin`, `editor`, `support`)
- atribuir permissões
- atribuir usuários a roles

---

### 3.3 Gerenciar Categorias
Ações:
- criar/editar categoria
- definir slug e hierarquia (parent)
- traduzir nome/descrição (pt/en)
- ativar/desativar

---

### 3.4 Gerenciar Produtos
Ações:
- criar/editar produto
- definir tipo: **physical** ou **digital**
- setar preço base BRL (ou por variante)
- traduzir conteúdo pt/en
- ativar/desativar

---

### 3.5 Variantes e Estoque
Ações:
- criar variantes (SKU, nome, preço BRL)
- ajustar estoque (para físico)
- para digital, estoque pode ser `null` (sem controle)

Regras:
- estoque só baixa em `paid`

---

### 3.6 Imagens de Produto
Ações:
- upload de imagens
- ordenar imagens
- remover/atualizar

---

### 3.7 Cupons
Ações:
- criar cupom (percent/fixed)
- limitar por:
  - produto(s) e/ou categoria(s)
  - datas
  - limites de uso
- validar cupom e testar no carrinho

Regra:
- cupom **não** desconta frete

---

### 3.8 Pedidos e Pagamentos
Admin pode:
- listar pedidos
- ver detalhe do pedido (itens, endereço, frete, totals)
- ver status do pagamento (PagSeguro)
- ver payloads (se armazenados) e logs essenciais

Regra operacional:
- mudanças de status do pedido devem respeitar idempotência e integridade

---

### 3.9 Assets digitais (conteúdo entregue)
Admin pode:
- associar assets digitais a produtos/variantes:
  - arquivo local (upload)
  - link externo
  - licença (meta)

Regras:
- apenas pedidos `paid` criam “entitlements”
- downloads são protegidos e logados

---

### 3.10 Regras Discord (gating)
Admin pode:
- definir regras por produto/categoria:
  - guild id
  - role id / role necessária
- revisar comportamento (bloqueio no checkout/download)

---

### 3.11 Blog e Comentários
Admin pode:
- criar posts com tradução pt/en
- publicar/despublicar
- moderar comentários:
  - `pending` → `approved` / `rejected`

---

### 3.12 LGPD (Admin / usuário)
Admin/Usuário pode (dependendo da UI final):
- registrar consentimento de cookies (loja)
- solicitar exportação de dados (job)
- solicitar exclusão (job/processo), com política de retenção para pedidos

---

## 4) Operação (Rotinas recomendadas)

### 4.1 Verificações diárias
- checar falhas de queue (`failed_jobs`)
- checar webhooks do PagSeguro (logs)
- checar atualização de câmbio (FX daily)
- checar erros de download digital

### 4.2 Antes de campanhas/vendas
- confirmar Correios API
- confirmar PagSeguro (sandbox/prod)
- checar estoque de variantes físicas
- checar gating Discord (roles/guild)

---

## 5) Perguntas frequentes (FAQ)

### “Por que preciso de conta para comprar?”
Decisão do MVP: **sem guest checkout** para simplificar:
- histórico de pedidos
- acesso a downloads digitais
- integração Discord e gating

### “Por que o estoque não é reservado em pending?”
Decisão do MVP: evitar complexidade de expiração/reserva.  
Risco aceito: oversell em estoque baixo.

### “Cupom não aplica no frete?”
Decisão do MVP: cupom afeta apenas itens elegíveis e **não** afeta frete.

### “De onde vem o preço em USD?”
USD é convertido a partir do BRL usando taxa diária (cron), e o pedido guarda `fx_rate_used` para consistência.

---

## 6) Referências
- `README.md` — visão geral e setup
- `PROJECT_BLUEPRINT.md` — escopo completo
- `DIAGRAMS.md` — fluxos e ER
- `ARCHITECTURE.md` — decisões arquiteturais
- `CONFIGURATION.md` — variáveis `.env` e integrações
- `GUIDELINES.md` — padrões de código e contribuição
- `ROADMAP.md` — sprints e entregas
- `TASKS.md` — backlog detalhado

Copilot is powered by AI, so mistakes are possible. Leave a comment via the 👍 👎 to share your feedback and help improve the experience.