# nb-store — AGENTS (Guia para Agentes/IA e Automação)

Idioma de comunicação: **Português Brasileiro (pt-BR)**  
Data: **2025-12-16**  
Repo: **BlackCodePub/nb-store**  
Stack: **Laravel 11 + Blade + Bootstrap + MySQL**  
Ambiente alvo: **Hostinger Shared (FTP)** | Queue: **database** | SMTP: **Hostinger**

Este documento define como **agentes automatizados (IA), assistentes e automações** devem trabalhar neste repositório: padrões de comunicação, segurança, boas práticas, convenções e “contratos” do MVP.

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
- Quando fizer suposições, declare explicitamente.

---

## 2) “Contratos” do MVP (não negociar sem decisão explícita)
Agentes não devem alterar estes pontos sem aprovação:

1. **Laravel 11**
2. Loja e Admin em subdomínios com **sessões separadas**
3. Checkout **multi-etapas**
4. Sem guest checkout (**usuário precisa estar logado**)
5. Estoque: pedido `pending` **não reserva**, baixa apenas em `paid`
6. PagSeguro: parcelamento habilitado; **juros pagos pelo cliente**
7. Cupons por produto/categoria; **não** afetam frete
8. Digitais: storage **local** em `storage/app` com **links assinados**
9. Idiomas: pt-BR + en-US
10. Moedas: BRL base + USD via API + cron diário
11. Discord gating por produto/categoria (guild + role)
12. SMTP: Hostinger

---

## 3) Regra obrigatória: documentação na pasta `docs/` (organização e padrão)
**Regra:** toda documentação do projeto (exceto o `README.md` na raiz) deve ficar dentro da pasta **`docs/`**.

### 3.1 O que fica na raiz
- `README.md` (apresentação rápida + quickstart)
- `LICENSE` (quando definido)
- `CONTRIBUTING.md` (opcional)
- `SECURITY.md` (opcional, mas recomendado)

### 3.2 Padrão e organização sugerida em `docs/`
Estrutura recomendada:

```
docs/
  00-overview/
    PROJECT_BLUEPRINT.md
    ROADMAP.md
    TASKS.md

  01-architecture/
    ARCHITECTURE.md
    DIAGRAMS.md

  02-setup/
    CONFIGURATION.md
    USAGE.md
    DEPLOYMENT.md        # (sugestão futura) passo a passo Hostinger/FTP
    TROUBLESHOOTING.md   # (sugestão futura) problemas comuns

  03-security/
    SECURITY_GUIDE.md    # (sugestão futura) hardening, webhooks, downloads, LGPD
    THREAT_MODEL.md      # (sugestão futura) riscos e mitigação

  04-dev/
    GUIDELINES.md
    AGENTS.md
```

**Regra de naming:**
- Arquivos em **UPPER_SNAKE_CASE.md** (ex.: `PROJECT_BLUEPRINT.md`)
- Pastas numeradas para manter ordem lógica.

### 3.3 Índice de documentação
**Obrigatório:** manter um índice em `docs/README.md` apontando para todos os arquivos com descrição curta.

Exemplo:

- `docs/README.md`
  - links para as principais seções
  - “Como encontrar” (setup, arquitetura, segurança, operação)

### 3.4 Atualização de docs como parte do DoD
Se uma mudança alterar:
- env/cron/worker/webhooks → atualizar `docs/02-setup/CONFIGURATION.md`
- comportamento de segurança → atualizar `docs/03-security/*`
- arquitetura/fluxos → atualizar `docs/01-architecture/*`
- guidelines/processo → atualizar `docs/04-dev/*`

---

## 4) Regra obrigatória: código sempre comentado (por arquivo e por função)
**Obrigatório para qualquer contribuição (humana ou agente):**
- Todo arquivo novo **deve** começar com um cabeçalho curto explicando:
  - propósito do arquivo
  - como/onde ele é usado (rota, job, service, etc.)
  - pontos de segurança relevantes (quando aplicável)
- Toda classe/método/função nova **deve** ter comentário explicando:
  - o que faz
  - entradas e saídas (parâmetros/retorno)
  - efeitos colaterais (DB, e-mail, estoque, entitlements)
  - como usar/chamar
  - principais validações e guardas de segurança

### 4.1 Padrão recomendado de comentários (PHPDoc)
**Exemplo (Service)**
```php
<?php

/**
 * CouponService
 *
 * Responsável por validar e aplicar cupons no carrinho/pedido.
 * Uso típico:
 * - Store/CartController chama applyCoupon($user, $cart, $code)
 *
 * Segurança e regras do MVP:
 * - Cupom NÃO afeta frete
 * - Desconto só em itens elegíveis (produto/categoria)
 */
final class CouponService
{
    /**
     * Aplica um cupom ao carrinho do usuário.
     *
     * @param  User   $user  Usuário autenticado (MVP: sem guest checkout)
     * @param  Cart   $cart  Carrinho persistido do usuário
     * @param  string $code  Código do cupom (case-insensitive)
     * @return CartPricingResult Resultado com totais e itens elegíveis
     *
     * @throws DomainException Quando o cupom é inválido/expirado ou viola limites
     *
     * Efeitos colaterais:
     * - Pode registrar tentativa/uso (se implementado)
     *
     * Segurança:
     * - Validar entrada via FormRequest antes de chamar este método
     * - Não logar código completo se isso for considerado sensível (opcional)
     */
    public function applyCoupon(User $user, Cart $cart, string $code): CartPricingResult
    {
        // ...
    }
}
```

### 4.2 Regras adicionais para comentários
- Comentários devem ser **em pt-BR**.
- Não comentar o óbvio (ex.: `// soma +1`), mas sim o **porquê** e o **contrato**.
- Em pontos críticos, incluir comentários sobre:
  - idempotência (webhooks)
  - transações
  - rate limiting esperado
  - validações de ownership (downloads)
- Se houver “decisão do MVP” impactando o código, deixar explícito no comentário.

---

## 5) Dependências e bibliotecas (regras)
### 5.1 Versões e atualização
- Sempre preferir:
  - **versão mais recente estável**
  - bibliotecas **mantidas ativamente**
  - bibliotecas recomendadas pela comunidade Laravel
- Antes de sugerir uma lib, verifique:
  - última release recente
  - compatibilidade com Laravel 11
  - número de downloads/uso real
  - licenciamento

### 5.2 Evitar dependências desnecessárias
- Em shared hosting, menos dependências = menos risco operacional.
- Não adicionar libs “apenas por conveniência” se o Laravel já resolve nativamente.

---

## 6) Segurança (prioridade máxima)
### 6.1 Regras gerais
- Nunca introduzir:
  - SQL injection (use Eloquent/Query Builder)
  - XSS (escape em Blade; sanitize conteúdo quando necessário)
  - CSRF (usar proteção padrão; cuidado com webhooks)
  - SSRF (validar URLs externas)
  - Path traversal (principalmente em downloads e uploads)
  - Open redirects
- Validar input **sempre** via `FormRequest` (`app/Http/Requests/*`).
- **Nunca** logar tokens, secrets ou dados sensíveis em texto puro.

### 6.2 Rate limiting (obrigatório)
Aplicar throttle em:
- Login e reset de senha
- Webhooks (PagSeguro)
- Downloads digitais

**Exemplo (Laravel RateLimiter)**
```php
<?php
// app/Providers/RouteServiceProvider.php (exemplo)
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

public function boot(): void
{
    RateLimiter::for('login', function (Request $request) {
        $key = 'login:'.strtolower((string) $request->input('email')).'|'.$request->ip();
        return Limit::perMinute(5)->by($key);
    });

    RateLimiter::for('webhooks', function (Request $request) {
        return Limit::perMinute(120)->by('webhooks|'.$request->ip());
    });

    RateLimiter::for('downloads', function (Request $request) {
        $userId = $request->user()?->id ?? 'guest';
        return Limit::perMinute(30)->by('downloads|'.$userId.'|'.$request->ip());
    });
}
```

E em rotas:
```php
Route::post('/webhooks/pagseguro', ...)->middleware('throttle:webhooks');
Route::get('/downloads/{entitlement}', ...)->middleware(['auth', 'throttle:downloads', 'signed']);
```

### 6.3 Webhooks (PagSeguro) — idempotência e validação
**Obrigatório:**
- validar assinatura/secret (se disponível no PagSeguro)
- registrar payload com cuidado (sanitizar)
- idempotência por `provider_reference`

**Padrão recomendado:**
- `payments.provider_reference` **unique**
- ao receber webhook:
  - se já processado → retornar `200 OK` sem reexecutar efeitos
  - se novo → salvar + aplicar transição

**Exemplo (idempotência simplificada)**
```php
DB::transaction(function () use ($providerReference, $payload) {
    $payment = Payment::where('provider_reference', $providerReference)->lockForUpdate()->first();

    if ($payment && $payment->status === 'paid') {
        // idempotente: já processado
        return;
    }

    $payment ??= Payment::create([
        'provider' => 'pagseguro',
        'provider_reference' => $providerReference,
        'status' => 'received',
        'payload_json' => $payload,
    ]);

    // Atualiza status de pagamento e pedido de forma consistente
    // Efeitos colaterais devem ter guardas (estoque, entitlements, emails)
});
```

### 6.4 Downloads digitais (storage/app) — hardening
**Obrigatório:**
- rota assinada (`signed`)
- autenticação (`auth`)
- checar entitlement (owner, expiração, limite)
- logs de download (IP + user-agent)
- servir arquivo via stream/response, **nunca** expor path real

### 6.5 Uploads (imagens e arquivos digitais)
- Validar **mimetype**, extensão e tamanho
- Para digitais, armazenar em disk `local` (privado)

### 6.6 XSS / Conteúdo do blog
- Comentários: escapar sempre em Blade `{{ }}`.
- Se permitir HTML, sanitizar com lib mantida e recomendada.

---

## 7) Privacidade e LGPD (mínimo do MVP)
- Consentimento cookies registrado
- Exportação e exclusão com jobs
- Evitar dados desnecessários e vazamento em logs

---

## 8) Checklist obrigatório antes de “finalizar” uma entrega
Agentes devem sempre conferir:
- [ ] documentação em `docs/` atualizada e indexada em `docs/README.md`
- [ ] **código comentado** (arquivo + funções; em pt-BR; explicando uso)
- [ ] validação de input via FormRequest
- [ ] auth + policies (admin e downloads)
- [ ] rate limiting aplicado (login/webhook/download)
- [ ] logs adicionados sem vazamento de secrets
- [ ] transações nos pontos críticos
- [ ] idempotência em webhooks
- [ ] compatibilidade com Laravel 11 e libs atualizadas
- [ ] sem mudanças que quebrem os “contratos” do MVP

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