# nb-store (NoBugs Store)

E-commerce (tema fixo) construído em **Laravel 11** para venda de **produtos físicos e digitais**, com checkout multi-etapas, PagSeguro, frete via Correios, entrega digital segura e regras de acesso via Discord.

> Status: MVP em construção (documentação e backlog definidos)

---

## Domínios

### Produção
- Loja: https://nobugs.com.br  
- Admin: https://admin.nobugs.com.br  
- (Opcional) API: https://api.nobugs.com.br  

### Desenvolvimento
- Loja: https://localhost  
- Admin: https://admin.localhost  
- (Opcional) API: https://api.localhost  

**Importante:** Loja e Admin usam **sessões separadas** (logins não são compartilhados entre subdomínios).

---

## Principais features (MVP)

### Loja (web)
- Catálogo com **pt-BR / en-US**
- Produtos **físicos** e **digitais**
- **Variações** (ex.: licença/tamanho/cor) + snapshots no pedido
- Carrinho (usuário precisa estar logado; **sem guest checkout**)
- Checkout multi-etapas:
  1) Endereço  
  2) Frete (Correios)  
  3) Pagamento (PagSeguro)  
  4) Revisão/Confirmação  
- Pagamento via **PagSeguro** com **parcelamento** (juros pagos pelo cliente)
- Entrega digital:
  - arquivos locais (`storage/app`)
  - **links assinados** + limite de downloads + expiração
  - logs de download
- **Cupons** (global ou restrito por **produto/categoria**; **não** desconta frete)
- “Minha Conta”: pedidos, downloads, preferências (idioma/moeda)

### Admin (web)
- Dashboard + CRUD:
  - produtos, categorias, variações, imagens
  - pedidos + pagamentos
  - cupons
  - assets digitais
  - regras Discord
  - blog + comentários (moderação)
- RBAC (roles/permissões) com **níveis/hierarquia** e “invisibilidade”

### Integrações (MVP)
- **Correios (API direta)**: cotação de frete e seleção de serviço
- **PagSeguro**: criação de cobrança + webhooks
- **Discord gating**: exigir guild/role por produto/categoria para comprar e/ou baixar

### Conformidade (LGPD)
- Consentimento de cookies
- Exportação de dados
- Exclusão/anonimização de conta (política definida na implementação)

---

## Regras de negócio importantes

- **Estoque:** pedidos `pending` **não reservam** estoque. Baixa estoque apenas quando `paid`.
- **Moeda/Preços:** preço base em **BRL**; exibição em **USD** por conversão (câmbio diário via API + cron).
- **Cupons:** aplicam em itens elegíveis (produto/categoria). **Frete não recebe desconto**.
- **Digital:** somente pedidos `paid` geram direitos (entitlements) de download.
- **Segurança:** downloads são autenticados, rastreados e limitados.

---

## Stack

- **Laravel 11**
- Blade + Bootstrap (tema fixo)
- MySQL
- Filas: `database` (queue worker via cron no shared hosting)
- Storage: local (`storage/app`)
- Hospedagem: Hostinger Shared (deploy via FTP)
- SMTP: Hostinger

---

## Estrutura sugerida do projeto

- Rotas:
  - `routes/web.php` (Loja)
  - `routes/admin.php` (Admin)
- Controllers:
  - `app/Http/Controllers/Store/*`
  - `app/Http/Controllers/Admin/*`
  - `app/Http/Controllers/Webhooks/*`
- Views:
  - `resources/views/store/*`
  - `resources/views/admin/*`
- Services:
  - `app/Services/Shipping/*` (Correios)
  - `app/Services/Payments/*` (PagSeguro)
  - `app/Services/Discord/*` (Discord)
  - `app/Services/Pricing/*` (Cupons/precificação)
  - `app/Services/FX/*` (Câmbio)
- Jobs:
  - `app/Jobs/*` (câmbio, export LGPD, etc.)
- Models/Migrations:
  - `app/Models/*`
  - `database/migrations/*`

---

## Setup local (guia rápido)

> Ajuste conforme o ambiente do time. Este é um baseline.

1) Instale dependências:
```bash
composer install
npm install
```

2) Crie o `.env`:
```bash
cp .env.example .env
php artisan key:generate
```

3) Configure banco (MySQL) no `.env` e rode migrations:
```bash
php artisan migrate
```

4) Build de assets:
```bash
npm run dev
```

5) Suba o servidor:
```bash
php artisan serve
```

---

## Cron/Queue (Hostinger Shared)

**Schedule**
```bash
* * * * * php /path/to/artisan schedule:run >> /dev/null 2>&1
```

**Queue (database)**
Se não houver daemon, use:
```bash
* * * * * php /path/to/artisan queue:work --stop-when-empty >> /dev/null 2>&1
```

---

## Ambiente / Configuração (checklist)

No `.env` (produção):
- `APP_ENV=production`
- `APP_DEBUG=false`
- SMTP Hostinger (`MAIL_*`)
- `QUEUE_CONNECTION=database`
- Credenciais PagSeguro
- Credenciais Discord (OAuth)
- Config Correios
- Config FX provider (BRL->USD)

---

## Roadmap (MVP em sprints de 1 semana — visão macro)

- Sprint 1: base do projeto + auth + layouts + queue/cron + UI kits
- Sprint 2: RBAC + catálogo + translations + locale
- Sprint 3: variações + estoque + imagens + produto completo
- Sprint 4: carrinho + cupons + checkout (endereço/frete esqueleto)
- Sprint 5: Correios + orders + checkout cria `pending`
- Sprint 6: PagSeguro + webhooks + e-mails
- Sprint 7: entrega digital + Discord gating + minha conta (downloads)
- Sprint 8: blog + comentários + LGPD + hardening + go-live

---

## Documentação
- Veja `PROJECT_BLUEPRINT.md` (escopo, decisões, modelo de dados, integrações e backlog macro).

---

## Licença
A definir.

Copilot is powered by AI, so mistakes are possible. Leave a comment via the 👍 👎 to share your feedback and help improve the experience.