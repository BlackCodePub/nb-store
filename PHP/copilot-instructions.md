# Instruções do GitHub Copilot — nb-store (MVP)

Idioma obrigatório: **Português Brasileiro (pt-BR)**  
Stack: **Laravel 11 + Blade + Bootstrap + MySQL**  
Ambiente alvo: **Hostinger Shared (FTP)** | Queue: **database** | SMTP: **Hostinger**  
Data: **2025-12-16**

Este arquivo define **como o GitHub Copilot deve atuar** neste repositório: comunicação, padrões de código, organização, segurança e critérios de qualidade.

> Prioridade #1: **Segurança e consistência**  
> Prioridade #2: **Boas práticas e código sustentável**  
> Prioridade #3: **Velocidade** (apenas quando não comprometer #1 e #2)  
> Dependências: **sempre usar bibliotecas atualizadas (versão mais recente estável e recomendada)**.

---

## 1) Comunicação (pt-BR)
- Responder e escrever documentação, comentários e mensagens de commit/PR em **Português Brasileiro**.
- Ser objetivo e técnico.
- Sempre declarar suposições e trade-offs.
- Ao propor mudanças, incluir:
  - O que muda
  - Por que muda
  - Impacto (técnico/negócio/segurança)
  - Como testar
  - Riscos e mitigação

---

## 2) “Contratos” do MVP (não alterar sem decisão explícita)
Copilot não deve sugerir/implementar alterações que quebrem:

1. **Laravel 11**
2. Loja e Admin em subdomínios com **sessões separadas**
3. Checkout **multi-etapas**
4. Sem guest checkout (**usuário precisa estar logado**)
5. Estoque: pedido `pending` **não reserva**, baixa apenas em `paid`
6. PagSeguro: parcelamento habilitado; **juros pagos pelo cliente**
7. Cupons por produto/categoria; **não** afetam frete
8. Digitais: storage **local** em `storage/app` com **links assinados**
9. Idiomas: pt-BR + en-US
10. Moedas: BRL base + USD via câmbio diário (cron)
11. Discord gating por produto/categoria (guild + role)
12. SMTP: Hostinger

---

## 3) Documentação obrigatória em `docs/`
**Regra:** toda documentação (exceto `README.md`) deve ficar na pasta `docs/`.

### 3.1 Organização recomendada
```
docs/
  00-overview/        # visão geral e backlog
  01-architecture/    # arquitetura e diagramas
  02-setup/           # configuração, deploy, troubleshooting
  03-security/        # hardening, threat model, LGPD
  04-dev/             # guidelines, agents, padrões internos
  README.md           # índice único da documentação
```

### 3.2 Regra de atualização
Se uma alteração impactar:
- env/cron/queue/webhooks → atualizar `docs/02-setup/*`
- fluxos/arquitetura → atualizar `docs/01-architecture/*`
- segurança/privacy → atualizar `docs/03-security/*`
- padrões internos → atualizar `docs/04-dev/*`

---

## 4) Código sempre comentado (por arquivo e por função)
**Obrigatório**:
- Todo arquivo novo deve ter cabeçalho com:
  - propósito
  - onde é usado (rotas/jobs/services)
  - pontos críticos de segurança
- Toda função/método/classe nova deve ter comentário (preferencialmente PHPDoc) explicando:
  - o que faz
  - inputs/outputs
  - efeitos colaterais (DB, queue, mail, estoque, downloads)
  - como usar
  - guardas de segurança relevantes

**Exemplo (PHPDoc)**
```php
/**
 * MarkOrderPaid
 *
 * Use-case responsável por transicionar o pedido de `pending` para `paid`
 * de forma idempotente, baixando estoque e liberando digitais.
 *
 * Uso:
 * - Chamado pelo handler de webhook do PagSeguro após validação do evento.
 *
 * Segurança/consistência:
 * - Deve rodar em transação
 * - Deve ser idempotente (não executar efeitos duas vezes)
 */
final class MarkOrderPaid
{
    // ...
}
```

---

## 5) Boas práticas (padrão de arquitetura no código)
- Controllers finos: valida request → chama Service/Action → retorna response/view.
- Validação sempre por **FormRequest**.
- Regras de negócio/integrations:
  - `app/Services/*` (PagSeguro, Correios, Discord, FX, Pricing)
  - `app/Actions/*` (transições críticas: mark paid, decrement stock, grant entitlements)
- Policies e gates para Admin (RBAC + níveis).
- Preferir transações (`DB::transaction`) em pontos críticos.

---

## 6) Dependências (sempre atualizadas e estáveis)
- Antes de adicionar uma lib, verificar:
  - compatibilidade com Laravel 11
  - manutenção ativa
  - releases recentes
- Evitar libs desnecessárias se o Laravel já cobre.
- Não sugerir bibliotecas abandonadas/sem manutenção.

---

## 7) Segurança (critério de aceite obrigatório)
### 7.1 Não introduzir vulnerabilidades
Copilot deve evitar:
- SQL injection (use Eloquent/Query Builder)
- XSS (escape em Blade; sanitize conteúdo se houver HTML rico)
- CSRF (proteger forms; cuidado com webhooks)
- SSRF (validar URLs externas)
- Path traversal (uploads/downloads)
- Open redirect
- Vazamento de secrets (logs/erros)

### 7.2 Rate limiting (obrigatório)
Aplicar throttle em:
- login/reset password
- webhooks
- downloads digitais

**Exemplo**
```php
// routes/web.php (exemplo)
Route::post('/webhooks/pagseguro', ...)->middleware('throttle:webhooks');
Route::get('/downloads/{entitlement}', ...)->middleware(['auth', 'signed', 'throttle:downloads']);
```

### 7.3 Webhooks (PagSeguro) — idempotência obrigatória
Regras:
- validar assinatura/secret (se disponível)
- salvar referência do provider e payload (com cuidado)
- idempotência por `provider_reference` (unique)
- não duplicar:
  - baixa de estoque
  - criação de entitlements
  - e-mails

**Exemplo (idempotência simplificada com lock)**
```php
DB::transaction(function () use ($providerReference, $payload) {
    $payment = Payment::where('provider_reference', $providerReference)
        ->lockForUpdate()
        ->first();

    if ($payment && $payment->status === 'paid') {
        return; // já processado
    }

    // cria/atualiza payment e transiciona order com guardas
});
```

### 7.4 Downloads digitais (obrigatório: signed + auth + entitlement)
- arquivo em `storage/app` (não público)
- rota assinada + auth
- checar:
  - owner
  - expiração
  - limite de downloads
- logar downloads

**Exemplo**
```php
abort_unless($request->hasValidSignature(), 401);
abort_unless($entitlement->user_id === $request->user()->id, 403);
```

### 7.5 Uploads
- validar mime/extensão/tamanho
- armazenar com path controlado (sem usar nome original diretamente)
- para digitais, usar disk `local` (privado)

### 7.6 Logs (sem secrets)
- logar eventos úteis (webhook, download, ações admin)
- nunca logar tokens OAuth, secrets ou dados sensíveis

---

## 8) Regras de negócio essenciais (reforço)
- **Sem guest checkout**.
- `pending` não reserva estoque; baixa em `paid`.
- Cupom não afeta frete.
- BRL base; USD por câmbio diário; salvar `fx_rate_used` no pedido.
- Discord gating por produto/categoria (guild + role), checar no checkout e no download (recomendado).

---

## 9) Operação (Hostinger Shared)
- `QUEUE_CONNECTION=database`
- Cron:
  - `schedule:run` 1x por minuto
  - `queue:work --stop-when-empty` 1x por minuto (se não houver daemon)
- Qualquer mudança operacional deve atualizar docs em `docs/02-setup/`.

---

## 10) Checklist obrigatório (antes de concluir uma tarefa)
Copilot deve garantir:
- [ ] Código novo **comentado** (arquivo + funções) em pt-BR
- [ ] Validação via FormRequest
- [ ] Auth + Policies onde aplicável
- [ ] Rate limiting aplicado (login/webhook/download)
- [ ] Idempotência em webhooks
- [ ] Downloads assinados e logados
- [ ] Sem vazamento de secrets em logs
- [ ] Transações em pontos críticos
- [ ] Dependências atualizadas e estáveis
- [ ] Documentação atualizada em `docs/` e indexada em `docs/README.md`

---
```