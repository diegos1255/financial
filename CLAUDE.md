# CLAUDE.md — Workspace `financial`

Este arquivo orienta o Claude Code ao trabalhar neste workspace. Leia antes de qualquer ação.

## O que é este projeto

Sistema de controle financeiro pessoal — projeto **educacional** para o Diego praticar **Spec Driven Development (SDD)** com Claude Code antes de aplicar SDD em sistemas reais do trabalho.

**Não é produção.** O objetivo é exercitar o **fluxo SDD**, não entregar produto.

## Fluxo de trabalho — OBRIGATÓRIO

Para qualquer feature, configuração de ambiente, mudança de arquitetura ou implementação:

```
1. PLANO  →  Diego aprova
2. SPEC   →  Diego aprova
3. CÓDIGO →  Diego revisa
```

**Nunca pular etapas.** Mesmo para tarefas que pareçam simples. O ponto do projeto é praticar SDD.

Exceções (pode prosseguir direto): comandos triviais e isolados — renomear arquivo, ajuste pontual de config, responder uma dúvida.

## Estrutura do workspace

```
D:\claude\financial\                                  ← workspace do Claude project (raiz)
├── CLAUDE.md                                         ← este arquivo
├── 04-development-spec-system-design-template.md     ← template SDD (não editar)
├── docs\
│   ├── 01-database-modeling.md                       ← schema completo do banco (aprovado)
│   ├── 02-development-plan.md                        ← plano-mãe com 10 fases (WORK-XX)
│   └── specs\                                        ← uma spec por fase, futuras
│       └── phase-XX-*.md
├── financial\           → junction para D:\workspace\financial         (backend Spring Boot)
├── security\            → junction para D:\workspace\security          (lib JWT/BCrypt)
└── financial-front\     → junction para D:\workspace\financial-front   (SPA React — vazio)
```

As pastas `financial`, `security` e `financial-front` são **junctions** (atalhos NTFS) para `D:\workspace\*`. O código real vive lá; aqui são links pra facilitar navegação. **Não trate como projetos diferentes** — é o mesmo conteúdo via dois paths.

Cada sub-projeto tem seu próprio `CLAUDE.md` (em `financial/CLAUDE.md` e `security/CLAUDE.md`) com instruções específicas.

## Stack consolidada (ver `docs/02-development-plan.md` §6 para componentes)

| Camada | Tecnologia | Versão / nota |
|---|---|---|
| JDK | Eclipse Temurin | 21 LTS (`C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot`) |
| Build | Maven Wrapper (`mvnw`) | Maven NÃO instalado globalmente |
| Backend | Spring Boot | **4.0.6** (atenção: sem sufixo `.RELEASE` — Initializr gera errado) |
| Auth | Spring Security + JJWT 0.12.6 + BCrypt | Em projeto Maven separado (`security`) |
| ORM | Spring Data JPA + Hibernate | `ddl-auto=update` (sem migrations por decisão) |
| DB | PostgreSQL | 16 (via docker-compose, ainda não configurado) |
| Frontend | React + Vite + TypeScript + Tailwind | Ainda não criado |

## Decisões já firmadas (NÃO re-perguntar)

- Java 21 LTS. Boot 4.0.6.
- Domínio: `User`, `BankAccount`, `Expense` (FIXED/INSTALLMENT), `Installment`, `ExpenseCategory`, `Salary` (por competência), `Investment`, `Menu` (global, populado via `data.sql`).
- Signup público + upload de foto via MinIO (S3-compatible em container). Senha forte: 10+ chars, maiúsc/minúsc/número/especial. Foto JPG/PNG máx 2MB.
- BCrypt strength 10. JWT 8h. MapStruct para Entity↔DTO.
- Soft-delete sempre — nada de DELETE físico.
- `user_id` em todas as tabelas de domínio (multi-user-ready).
- Valores monetários: `NUMERIC(12,2)`. UUIDs como PK. `TIMESTAMP WITH TIME ZONE`.
- Sem migrations (Flyway/Liquibase). Schema gerado pelo Hibernate.

## Comandos úteis

```powershell
# Compilar e instalar a lib security no .m2 local (sempre antes de tocar no financial)
cd D:\workspace\security
.\mvnw.cmd clean install -DskipTests

# Rodar o backend
cd D:\workspace\financial
.\mvnw.cmd spring-boot:run

# Validar que o financial compila com a dependência security
cd D:\workspace\financial
.\mvnw.cmd clean compile
```

## Memória persistente

Existe memória em `C:\Users\diego\.claude\projects\D--claude-financial\memory\` com perfil do Diego, decisões e snapshots de estado. É carregada automaticamente — não duplicar conteúdo aqui.

## O que não fazer

- Não criar código sem spec aprovada (ver fluxo acima).
- Não usar Spring Boot `4.0.6.RELEASE` (não existe — usar `4.0.6`).
- Não rodar `git push`, `git reset --hard`, `docker-compose down -v` ou qualquer destrutivo sem autorização.
- Não instalar Maven globalmente; usar `mvnw` sempre.
- Não criar **endpoints CRUD** de menu (decidido: apenas `GET /api/menus`; insert/update via SQL direto). Tabela `menus` existe no banco.
- Não modificar `04-development-spec-system-design-template.md` (é o template-mestre).
