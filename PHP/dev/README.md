# Documentação — nb-store (MVP)

Idioma oficial: **Português Brasileiro (pt-BR)**  
Data: **2025-12-16**  
Repo: **BlackCodePub/nb-store**  
Stack: **Laravel 11 + Blade + Bootstrap + MySQL** (Hostinger Shared)

Este índice organiza toda a documentação necessária para que um agente de IA (ou dev) consiga **entender e implementar 100% do MVP**.

## 1) Visão geral
- `00-overview/PROJECT_BLUEPRINT.md` — escopo completo do MVP, decisões, modelo de dados e integrações
- `00-overview/ROADMAP.md` — roadmap em sprints
- `00-overview/TASKS.md` — backlog detalhado em tasks (checklists)

## 2) Arquitetura
- `01-architecture/ARCHITECTURE.md` — decisões arquiteturais e organização do monólito
- `01-architecture/DIAGRAMS.md` — diagramas (C4, fluxos, ER, estados)
- `01-architecture/STRUCTURE.md` — estrutura recomendada de pastas/arquivos

## 3) Setup, deploy e operação
- `02-setup/CONFIGURATION.md` — `.env`, cron, queue, integrações
- `02-setup/USAGE.md` — como usar loja e admin (operacional)
- `02-setup/DEPLOYMENT.md` — guia de deploy Hostinger/FTP (passo a passo)
- `02-setup/TROUBLESHOOTING.md` — problemas comuns e como resolver

## 4) Segurança
- `03-security/SECURITY_GUIDE.md` — checklist e padrões de hardening
- `03-security/THREAT_MODEL.md` — ameaças, riscos e mitigação (por feature)

## 5) Desenvolvimento e agentes
- `04-dev/GUIDELINES.md` — padrões de contribuição e code style
- `04-dev/AGENTS.md` — regras para agentes/IA (comentários, docs, segurança)
- `04-dev/DEFINITION_OF_DONE.md` — DoD com critérios claros por tipo de mudança
- `04-dev/CODE_REVIEW_CHECKLIST.md` — checklist de revisão (segurança, consistência, operação)

> Observação: o `README.md` na raiz é o “cartão de visita” do projeto.  
> O `copilot-instructions.md` na raiz define regras do Copilot.
