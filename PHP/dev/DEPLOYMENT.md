# Deploy — Hostinger Shared (FTP) — nb-store

Data: **2025-12-16**  
Stack: Laravel 11 + Vite + MySQL  
Objetivo: um passo a passo operacional para publicar e manter o MVP em produção.

> Premissas do MVP:
> - Deploy via FTP (Hostinger Shared)
> - Queue `database`
> - Cron para `schedule:run` e `queue:work`
> - Storage local para digitais (`storage/app`) e imagens públicas via symlink `public/storage`

---

## 1) Pré-requisitos
- Banco MySQL criado na Hostinger
- Domínios configurados:
  - `nobugs.com.br` (loja)
  - `admin.nobugs.com.br` (admin)
- SSL ativo
- Acesso ao File Manager/FTP
- (Se disponível) Acesso SSH ajuda, mas não é obrigatório

---

## 2) Build local (recomendado)
Em shared hosting, é comum **não** ter um ambiente robusto para build.

### 2.1 PHP deps
No seu ambiente local/CI:
```bash
composer install --no-dev --optimize-autoloader
```

### 2.2 Front-end build
```bash
npm ci
npm run build
```

Isso gera `public/build/*` (Vite).

> Recomendação: não buildar em produção; faça build local e envie os artefatos.

---

## 3) O que enviar por FTP
Enviar:
- `app/`
- `bootstrap/`
- `config/`
- `database/`
- `public/` (incluindo `public/build`)
- `resources/` (opcional, mas ok enviar)
- `routes/`
- `storage/` (pasta sim, conteúdo pode variar)
- `vendor/` (se não houver composer em produção)
- arquivos raiz: `artisan`, `composer.json`, etc.

**Atenção:** não subir `.env` junto com o repositório público. Suba manualmente no servidor.

---

## 4) Configuração do `.env` em produção (essencial)
Criar `.env` no servidor com:
- DB `mysql`
- `APP_ENV=production`, `APP_DEBUG=false`
- `QUEUE_CONNECTION=database`
- SMTP Hostinger
- PagSeguro produção + webhook secret
- Discord OAuth
- Correios credentials (se existirem)
- FX provider key

Ver `docs/02-setup/CONFIGURATION.md`.

---

## 5) Permissões (storage/cache)
Garantir que estas pastas tenham permissão de escrita:
- `storage/`
- `bootstrap/cache/`

---

## 6) Migrations
Se tiver SSH:
```bash
php artisan migrate --force
```

Sem SSH:
- considere um “painel” admin temporário (somente em staging) para disparar migrations — **não recomendado**
- ou solicite ativação de SSH na Hostinger
- ou execute migrations via um job controlado (apenas para admin master) — **cuidado** e remover depois

> Recomendação forte: obter SSH para rodar migrations com segurança.

---

## 7) Cache de config/rotas (produção)
Se tiver SSH:
```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## 8) Storage: link para imagens
Criar symlink:
```bash
php artisan storage:link
```

Se não tiver SSH e precisar manual:
- criar um link/symlink `public/storage` → `storage/app/public` (quando o host suportar)
- alternativa: expor imagens por controller (mais lento) — **evitar**

---

## 9) Cron jobs (obrigatório)
### 9.1 Scheduler
```
* * * * * php /path/to/artisan schedule:run >> /dev/null 2>&1
```

### 9.2 Queue worker (database)
```
* * * * * php /path/to/artisan queue:work --stop-when-empty >> /dev/null 2>&1
```

---

## 10) Checklist pós-deploy (smoke test)
- [ ] Loja abre (home)
- [ ] Admin abre e autentica (sessão separada)
- [ ] Cadastro/login/verify email funciona (SMTP)
- [ ] Carrinho e checkout avançam steps
- [ ] Correios retorna cotação
- [ ] PagSeguro cria cobrança
- [ ] Webhook atualiza pedido para `paid` (idempotente)
- [ ] Digitais liberam e download é assinado e logado
- [ ] FX rate atualizado (job diário) e USD exibido quando selecionado

---

## 11) Rollback (prático em FTP)
- Manter um backup do diretório anterior (ou zip)
- Evitar mudanças irreversíveis sem migration reversível
- Se migration quebrar, priorizar hotfix e nova migration corretiva
