# nb-store — Guidelines (MVP)

Data: **2025-12-16**  
Repo: **BlackCodePub/nb-store**  
Stack: **Laravel 11 + Blade + Bootstrap + MySQL**  
Hospedagem: **Hostinger Shared (FTP)**

Este documento define padrões de implementação, convenções e regras de contribuição para manter o projeto consistente e “MVP-friendly”.

---

## 1) Princípios do projeto
1. **MVP primeiro**: prefira soluções simples, legíveis e operáveis no shared hosting.
2. **Monólito bem organizado**: separar por rotas/middlewares/controllers/views e por “domínios” (services/actions).
3. **Segurança por padrão**: downloads assinados, rate limiting, validações fortes, logs com cuidado.
4. **Idempotência e consistência**: webhooks e transições de pedido devem ser reprocessáveis sem duplicar efeitos.
5. **Snapshots em pedidos**: nunca depender de preço/nome atuais do produto para pedidos antigos.
6. **Loja e Admin isolados**: sessões separadas e regras RBAC rígidas.

---

## 2) Convenções de branches e commits
### Branches
- `main`: produção/estável
- `dev`: integração (opcional, se adotarem)
- `feature/<slug>`: novas features
- `fix/<slug>`: correções
- `hotfix/<slug>`: urgente em produção

### Commits
- Prefira Conventional Commits:
  - `feat: ...`
  - `fix: ...`
  - `chore: ...`
  - `refactor: ...`
  - `docs: ...`
  - `test: ...`

Ex.: `feat: adicionar aplicação de cupom por categoria`

---

## 3) Organização de código (padrão de pastas)
### Rotas
- `routes/web.php` → Loja
- `routes/admin.php` → Admin
- Webhooks podem ficar em `routes/web.php` (prefixo `/webhooks`) ou `routes/webhooks.php` (opcional)

### Controllers
- `app/Http/Controllers/Store/*`
- `app/Http/Controllers/Admin/*`
- `app/Http/Controllers/Webhooks/*`

**Regra:** controllers devem ser finos. Validação → chamar service/action → retornar view/redirect.

### Requests (validação)
- `app/Http/Requests/Store/*`
- `app/Http/Requests/Admin/*`
- `app/Http/Requests/Webhooks/*`

### Services e Actions
- Integrações e lógica complexa devem ir para `app/Services/*`
- Transições críticas e “use-cases” podem ir para `app/Actions/*`

Sugestões:
- `app/Services/Payments/*` (PagSeguro)
- `app/Services/Shipping/*` (Correios)
- `app/Services/Pricing/*` (cupons, totais)
- `app/Services/Discord/*` (gating)
- `app/Services/FX/*` (câmbio)
- `app/Actions/Orders/*` (MarkPaid, Cancel, GrantEntitlements)
- `app/Actions/Coupons/*` (ApplyCoupon)

### Views
- `resources/views/store/*`
- `resources/views/admin/*`

### Assets e UI
- Bootstrap + Vite (Sass)
- Componentes Blade recomendados:
  - `resources/views/components/*`
  - `app/View/Components/*` (se necessário)

---

## 4) Naming e padrões de código
### Classes
- `StudlyCase`: `PagSeguroWebhookHandler`, `CorreiosClient`
- Sufixos sugeridos:
  - `*Controller`, `*Request`, `*Service`, `*Client`, `*Job`, `*Policy`

### Methods
- Verbos claros: `quote()`, `createCheckout()`, `applyCoupon()`, `markPaid()`

### Config/Env
- Preferir `config/*.php` + `env()` apenas em config.
- Não usar `env()` diretamente em services/controllers.

---

## 5) Regras de negócio: “contratos” que não podem quebrar
### 5.1 Sessões separadas (Loja/Admin)
- Não compartilhar `SESSION_DOMAIN` entre `nobugs.com.br` e `admin.nobugs.com.br` no MVP.
- Se necessário, usar cookie names distintos por host.

### 5.2 Estoque
- `pending` **não** baixa estoque.
- Baixa estoque **somente** quando o pedido vira `paid`.

### 5.3 Cupons
- Cupom pode restringir por **produto/categoria**.
- Cupom **não** afeta frete.
- Desconto deve ser aplicado apenas em itens elegíveis e salvo em snapshot no `order_items`.

### 5.4 PagSeguro / Webhooks
- Webhooks devem ser **idempotentes**.
- Não executar “efeitos colaterais” duas vezes:
  - baixar estoque
  - criar entitlements
  - enviar e-mails

### 5.5 Digital delivery
- Arquivos ficam em `storage/app` (privado).
- Downloads devem:
  - exigir auth
  - validar entitlement
  - usar rota assinada
  - registrar log de download
  - respeitar limites

### 5.6 Discord gating
- Regras por produto/categoria (guild + role).
- Checar gating no checkout **e** no download (recomendado).

### 5.7 Moeda e câmbio
- BRL é base.
- USD exibido por conversão (taxa diária).
- `fx_rate_used` deve ser persistido no pedido.

---

## 6) Banco de dados e migrations
### Migrations
- Uma migration por mudança lógica.
- Sempre incluir `down()` reversível quando viável.
- Indexar colunas de busca e integridade:
  - `coupon.code` (unique)
  - `payments.provider_reference` (unique)
  - pivots e FKs

### Snapshots em pedidos
- `order_items` deve conter:
  - `name_snapshot`
  - `unit_price_*_snapshot`
  - `discount_*_snapshot`
  - `type_snapshot`
- Nunca recalcular total histórico usando `products` atuais.

---

## 7) Tratamento de erros e UX
### Loja
- Mensagens claras em:
  - falha de pagamento
  - cupom inválido/expirado
  - indisponibilidade de frete
  - falta de acesso Discord
  - tentativa de download expirado

### Admin
- Alerts consistentes (success/error)
- Logs/auditoria mínima para ações sensíveis

---

## 8) Segurança
### Rate limiting (mínimo)
- Login / reset password
- Webhooks (PagSeguro)
- Downloads digitais

### Uploads
- Validar mime, size, extensão
- Armazenar em diretório seguro
- Jamais confiar em nome de arquivo do usuário

### Webhooks
- Validar assinatura/token quando disponível
- Logar com parcimônia (sem secrets)

---

## 9) Jobs, queue e scheduler
- Preferir jobs para:
  - fetch câmbio diário
  - exportação LGPD
  - e-mails que não precisam bloquear request
- Garantir que jobs sejam reexecutáveis (idempotentes quando aplicável).
- Monitorar `failed_jobs` no admin (recomendado criar uma tela simples depois).

---

## 10) Testes (mínimo viável)
Mesmo no MVP, recomenda-se ao menos:
- Unit:
  - `CouponService` (itens elegíveis, rateio, limites)
  - `OrderTotalCalculator`
- Feature:
  - fluxo de criar pedido `pending`
  - webhook “paid” muda status e baixa estoque
  - download digital protegido

Se não der para cobrir tudo, priorizar:
1) webhook idempotente
2) cupom com restrição
3) criação de pedido + snapshots

---

## 11) Padrões para issues/PRs
### Issues
Sempre incluir:
- contexto/objetivo
- critérios de aceite
- estimativa (h)
- referências de código (paths sugeridos)

### Pull Requests
- Descrição do que mudou e por quê
- Prints (loja/admin) quando for UI
- Checklist:
  - migrations? seeds?
  - configs/env?
  - impacto em cron/queue?
  - impacto em webhooks?

---

## 12) Checklist de “Definition of Done” (DoD)
Para considerar uma feature pronta:
- [ ] Critérios de aceite atendidos
- [ ] Validações e mensagens de erro implementadas
- [ ] Logs essenciais (quando crítico)
- [ ] Segurança (auth/rate limit) aplicada quando necessário
- [ ] Não quebra decisões do MVP (estoque, cupom, frete, etc.)
- [ ] Deploy checklist atualizado se houver mudanças operacionais

---

## 13) Referências
- `README.md` — visão geral e setup
- `PROJECT_BLUEPRINT.md` — especificação completa do MVP
- `ARCHITECTURE.md` — decisões arquiteturais e organização
- `CONFIGURATION.md` — envs, cron, integrações
- `DIAGRAMS.md` — diagramas do fluxo e ER

Copilot is powered by AI, so mistakes are possible. Leave a comment via the 👍 👎 to share your feedback and help improve the experience.