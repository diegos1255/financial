# Financial — Controle Financeiro Pessoal

Sistema completo de controle financeiro pessoal: salários por competência, despesas (fixas / parceladas / variáveis), investimentos com cotação de mercado em tempo real, dashboard com KPIs e drill-down. Multi-usuário, com autenticação JWT em cookie httpOnly, refresh-token rotation, rate limiting e CSP headers.

> **Projeto educacional.** Construído como exercício de **Spec Driven Development (SDD)** com Claude Code — todo trabalho passou por **Plano → Spec aprovada → Código**. O histórico de specs vive em `docs/specs/`.

---

## Stack

### Backend
| Camada | Tecnologia |
|---|---|
| Linguagem | Java 21 LTS (Eclipse Temurin) |
| Framework | Spring Boot **4.0.6** |
| Segurança | Spring Security 6 + JJWT 0.12.6 + BCrypt + Bucket4j (rate limit) |
| Persistência | Spring Data JPA + Hibernate (`ddl-auto=update`) |
| Banco | PostgreSQL 16 |
| Cache | Redis 7 (cotações de mercado, TTL 24h) |
| Storage | MinIO (S3-compatible — fotos de perfil) |
| Cotações | API pública [Brapi.dev](https://brapi.dev) |
| Mapeamento | MapStruct 1.6 |
| Build | Maven Wrapper (`mvnw`) |

### Frontend
| Camada | Tecnologia |
|---|---|
| Framework | React 18 + Vite + TypeScript |
| Estilo | TailwindCSS |
| HTTP | Axios (cookies httpOnly + CSRF token automático) |
| Gráficos | Recharts |
| Ícones | lucide-react |
| Toast | react-hot-toast |
| Datas | date-fns |

### Infra
- Docker Compose (Postgres + Redis + MinIO + backend + nginx-front)

---

## Funcionalidades

### Autenticação & Segurança
- **Signup público** com validação de senha forte (10+ caracteres, maiúscula, minúscula, número e especial)
- **Login** com JWT em cookie httpOnly (Lax/Strict + Secure em prod)
- **Refresh token** rotativo (sliding, 30 dias) em cookie httpOnly separado
- **Idle logout** automático após inatividade (com modal de aviso 1min antes)
- **Foto de perfil** (upload JPG/PNG até 2MB → MinIO)
- **Rate limiting** (Bucket4j): 5 req/min em endpoints de auth, 100 req/min nos demais
- **CSRF protection** com `XSRF-TOKEN` cookie + header `X-XSRF-TOKEN` (pattern SPA oficial Spring 6)
- **Security headers**: HSTS, CSP, Referrer-Policy, Permissions-Policy
- **Logs de atividade suspeita**: login falho, signup duplicado, JWT inválido, rate limit atingido

### Domínio
- **Contas bancárias** — CRUD + soft-delete + reativação
- **Categorias de despesa** — CRUD + cor customizada (color picker) + soft-delete
- **Salários por competência** — registro mensal por conta bancária
- **Despesas** com 3 tipos:
  - **FIXED** — recorrente mensal (mensalidades)
  - **INSTALLMENT** — parcelada (gera N parcelas mensais, com controle de status PENDING/PAID)
  - **VARIABLE** — pontual (compra única)
- **Pagamento de parcelas** — marcar como PAID, dashboard distingue pago vs. pendente
- **Investimentos** — cadastro de ticker + quantidade (preço vem do mercado, não digitado)

### Dashboard
- **KPIs** do mês: Salário, Total de Despesas (breakdown por chips coloridos: Fixas/Variáveis/Pagas/Pendentes), Saldo
- **Donut interativo** de despesas por categoria — clicar na fatia abre modal com a lista de despesas daquela categoria no mês
- **Card de Portfólio** com investimentos: ticker, quantidade, cotação atual (Brapi), variação % do dia, valor de mercado
- **Filtros** de mês/ano (combo que reflete em todos os blocos do dashboard)

### UX
- Input monetário com prefixo `R$` fixo, formatação BR automática (`1.234,56`) e bloqueio de caracteres não-numéricos
- Confirmação em ações de cadastro
- Toast feedback em todas as operações
- Soft-delete em todas as entidades (nada de DELETE físico)

---

## Estrutura do repositório

```
financial/                  ← raiz (este repositório)
├── README.md
├── CLAUDE.md               ← instruções pro Claude Code
├── docs/
│   ├── 01-database-modeling.md
│   ├── 02-development-plan.md
│   └── specs/              ← uma spec por fase (WORK-01 → WORK-16)
├── postman/                ← collection + environment
├── financial/              ← backend Spring Boot
│   ├── src/main/java/com/financial/
│   ├── src/main/resources/
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── pom.xml
├── security/               ← lib Maven (JWT + BCrypt + SecurityConfig + filters)
│   ├── src/main/java/com/financial/security/
│   └── pom.xml
└── financial-front/        ← SPA React
    ├── src/
    ├── public/
    ├── Dockerfile
    └── package.json
```

> **Nota Windows.** No workspace local original, as pastas `financial`, `security` e `financial-front` são **junctions NTFS** apontando para `D:\workspace\*`. No repositório git ficam como diretórios reais.

---

## Como rodar localmente

### Pré-requisitos
- Java 21 LTS (Temurin recomendado)
- Docker Desktop (Postgres + Redis + MinIO)
- Node.js 18+
- PowerShell (Windows) ou bash

### 1. Subir infra
```bash
cd financial
cp .env.example .env   # ajustar JWT_SECRET, BRAPI_TOKEN etc.
docker-compose up -d postgres redis minio
```

### 2. Instalar lib security no .m2 local
```bash
cd security
./mvnw clean install -DskipTests
```

### 3. Rodar backend
```bash
cd ../financial
./mvnw spring-boot:run
# disponível em http://localhost:8080
```

### 4. Rodar frontend
```bash
cd ../financial-front
npm install
npm run dev
# disponível em http://localhost:5174
```

---

## Variáveis de ambiente

Ver `financial/.env.example`. Variáveis obrigatórias em runtime:

| Var | Default | Descrição |
|---|---|---|
| `JWT_SECRET` | (obrigatório) | Secret HS256, mínimo 32 bytes |
| `JWT_COOKIE_SECURE` | `false` | `true` em prod (HTTPS) |
| `JWT_COOKIE_SAMESITE` | `Lax` | `None` em prod cross-domain |
| `POSTGRES_*` | `localhost:5432/financial` | conexão Postgres |
| `REDIS_HOST/PORT` | `localhost:6379` | cache de cotações |
| `MINIO_*` | `localhost:9000` | storage de fotos |
| `BRAPI_TOKEN` | (vazio) | token Brapi.dev (opcional no free) |

---

## Histórico de implementação (WORKs)

Cada fase tem uma spec aprovada em `docs/specs/`:

| WORK | Escopo |
|---|---|
| 01 | Setup inicial do projeto Spring Boot |
| 02 | Entidades JPA + relacionamentos |
| 03 | Spring Security + login JWT |
| 04 | CRUDs simples (contas, categorias, investimentos) |
| 05 | Salário por competência |
| 06 | Despesas + geração de parcelas |
| 07 | Dashboard (KPIs + agregações) |
| 08 | Frontend: setup + autenticação |
| 09 (+9B-9G) | CRUDs no front, dashboard, color picker, pagamento de parcelas |
| 10 | Docker Compose orquestrado |
| 11 | Signup + upload de foto (MinIO) |
| 12 | Hardening (rate limit + security headers + logs) |
| 13 | Queries extras |
| 14 | Hardening extra (CSRF + refresh token + CSP + idle logout) |
| 15 | Cotações de mercado (Brapi + cache Redis) |
| 16 | Dashboard enrichments (portfólio + drill-down pizza) |

---

## Licença

Projeto pessoal de aprendizado — sem licença formal definida.
