# nb-store — Go-Live Checklist

Data: **2025-12-26**  
Ambiente: **Produção (Vercel)**

---

## 1. DNS e SSL

- [ ] Domínio principal configurado (ex: loja.exemplo.com)
- [ ] Subdomínio admin configurado (ex: admin.exemplo.com)
- [ ] SSL/TLS ativo em todos os domínios (Vercel gerencia automaticamente)
- [ ] Redirect HTTP → HTTPS configurado
- [ ] HSTS habilitado

---

## 2. Variáveis de Ambiente (Vercel)

### Banco de Dados

- [ ] `DATABASE_URL` - Conexão MySQL produção
- [ ] Certificado SSL do banco (se aplicável)

### NextAuth

- [ ] `NEXTAUTH_URL` - URL pública da loja
- [ ] `NEXTAUTH_SECRET` - Secret forte (32+ chars)

### PagSeguro

- [ ] `PAGSEGURO_API_URL` - `https://api.pagseguro.com`
- [ ] `PAGSEGURO_TOKEN` - Token de produção
- [ ] `PAGSEGURO_EMAIL` - Email da conta
- [ ] `PAGSEGURO_WEBHOOK_SECRET` - Secret do webhook

### Storage

- [ ] `STORAGE_BUCKET` - Bucket S3/R2 para uploads
- [ ] `STORAGE_REGION` - Região do bucket
- [ ] `STORAGE_ACCESS_KEY` - Access key
- [ ] `STORAGE_SECRET_KEY` - Secret key
- [ ] `STORAGE_PUBLIC_URL` - URL pública do CDN
- [ ] `STORAGE_PRIVATE_BASE_URL` - Base URL privada (downloads)
- [ ] `STORAGE_SIGNING_SECRET` - Secret para assinar URLs
- [ ] `STORAGE_SIGNED_URL_TTL_SECONDS` - TTL das URLs assinadas

### Discord (Gating)

- [ ] `DISCORD_CLIENT_ID` - OAuth app ID
- [ ] `DISCORD_CLIENT_SECRET` - OAuth secret
- [ ] `DISCORD_BOT_TOKEN` - Token do bot (para verificar roles)

### Email

- [ ] `SMTP_HOST` - Servidor SMTP
- [ ] `SMTP_PORT` - Porta (587 para TLS)
- [ ] `SMTP_USER` - Usuário
- [ ] `SMTP_PASSWORD` - Senha
- [ ] `EMAIL_FROM` - Email de envio

### Outros

- [ ] `STORE_ZIP_CODE` - CEP de origem para frete
- [ ] `CRON_SECRET` - Secret para autenticar cron jobs
- [ ] `NODE_ENV=production`

---

## 3. Banco de Dados

- [ ] Migrations aplicadas (`prisma migrate deploy`)
- [ ] Índices otimizados
- [ ] Seed de dados iniciais (roles, permissions)
- [ ] Backup configurado
- [ ] Conexão SSL habilitada
- [ ] Pool de conexões configurado

---

## 4. Cron Jobs (Vercel Cron)

Configurar em `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/exchange-rate",
      "schedule": "0 6 * * *"
    }
  ]
}
```

- [ ] Cron FX diário funcionando
- [ ] Cron limpeza de tokens expirados (opcional)

---

## 5. Webhooks

### PagSeguro Webhook

- [ ] URL: `https://loja.exemplo.com/api/webhooks/pagseguro`
- [ ] Eventos: `CHARGE.PAID`, `CHARGE.CANCELED`
- [ ] Secret configurado no PagSeguro e no env

### Testar

- [ ] Criar cobrança de teste
- [ ] Verificar webhook recebido
- [ ] Verificar status atualizado

---

## 6. Storage Privado

- [ ] Bucket S3/R2 criado
- [ ] CORS configurado
- [ ] Políticas de acesso (privado por padrão)
- [ ] Signed URLs funcionando
- [ ] Testar download de arquivo digital

---

## 7. Segurança

- [ ] Headers de segurança (CSP, X-Frame-Options)
- [ ] Rate limiting ativo em todas as APIs sensíveis
- [ ] CORS configurado corretamente
- [ ] Validação de inputs em todas as APIs
- [ ] SQL injection prevenido (Prisma)
- [ ] XSS prevenido (React)
- [ ] CSRF tokens (NextAuth gerencia)
- [ ] Senhas hasheadas (bcrypt)

---

## 8. Monitoramento

- [ ] Logs de erro configurados (Vercel Logs)
- [ ] Alertas de erro (ex: Sentry)
- [ ] Monitoramento de performance (opcional)
- [ ] Analytics (ex: Vercel Analytics)

---

## 9. SEO e Performance

- [ ] `robots.txt` configurado
- [ ] `sitemap.xml` gerado
- [ ] Meta tags em todas as páginas
- [ ] Open Graph tags
- [ ] Imagens otimizadas (next/image)
- [ ] Bundle size otimizado
- [ ] Core Web Vitals aceitáveis

---

## 10. Teste Ponta-a-Ponta

### Produto Físico

- [ ] Navegar catálogo
- [ ] Adicionar ao carrinho
- [ ] Aplicar cupom
- [ ] Preencher endereço
- [ ] Calcular frete
- [ ] Realizar pagamento (cartão/PIX)
- [ ] Webhook processar pagamento
- [ ] Email de confirmação enviado
- [ ] Pedido visível em "Meus Pedidos"
- [ ] Admin: ver pedido, marcar enviado

### Produto Digital

- [ ] Comprar produto digital
- [ ] Pagamento aprovado
- [ ] Entitlement criado
- [ ] Aparecer em "Meus Downloads"
- [ ] Download funcionando
- [ ] Log de download registrado

### Auth

- [ ] Cadastro com verificação de email
- [ ] Login/logout
- [ ] Recuperação de senha
- [ ] Atualização de perfil

### Admin

- [ ] Login admin separado
- [ ] CRUD produtos
- [ ] Gerenciar pedidos
- [ ] Moderar comentários
- [ ] RBAC funcionando

### Discord Gating (se aplicável)

- [ ] Conectar conta Discord
- [ ] Verificar gating no produto
- [ ] Compra bloqueada sem requisitos

### LGPD

- [ ] Cookie consent aparecendo
- [ ] Exportação de dados
- [ ] Exclusão de conta

---

## ✅ Status de implementação (código)

Itens abaixo já estão implementados no código e precisam apenas de validação/infra em produção:

- Rate limiting em webhooks, comentários e downloads.
- Webhook PagSeguro com idempotência e auditoria.
- Downloads digitais com links assinados, expiração e limite.
- Exportação LGPD com endpoint de download e notificação por e-mail.

---

## 11. Backup e Recuperação

- [ ] Backup automático do banco
- [ ] Testar restore de backup
- [ ] Documentar processo de rollback

---

## 12. Documentação

- [ ] README atualizado
- [ ] CONFIGURATION.md com todas as envs
- [ ] Guia de deploy documentado
- [ ] Contato de suporte definido

---

## Assinatura

| Responsável | Data | Aprovação |
|-------------|------|-----------|

| | | [ ] Aprovado |

---

> **Após todos os itens marcados, o sistema está pronto para produção!**
