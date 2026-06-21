# Spec WORK-01 — Setup & Configuração inicial

> Spec da fase 1 do plano-mãe `02-development-plan.md`. Seguindo o template `04-development-spec-system-design-template.md`.

---

## Metadados

- **spec_id:** `WORK-01`
- **titulo_tecnico:** Setup completo do backend financial — docker-compose com Postgres, application.yml com placeholders ${VAR}, .env + .env.example, .gitignore, estrutura de packages, HealthController
- **source_product_spec:** `PLAN-01` (`docs/02-development-plan.md` v2)
- **source_product_spec_version:** 2026-05-31
- **baseline_branch_or_commit:** N/A (git ainda não inicializado — ver §13)
- **target_branch:** `feature/work-01-setup` (a criar quando o git for inicializado)
- **escopo_sistema:** `financial` (backend) + container `postgres` no docker-compose. **Não toca em** `security`, `financial-front`, `minio`.
- **última_atualização:** 2026-05-31

---

## 1. Objective do documento

**O que esta spec precisa permitir que engenharia faça:**
Levantar do zero o ambiente local completo do backend até o ponto em que `mvnw spring-boot:run` sobe sem erros, conecta no Postgres (rodando em container), e `GET /api/health` retorna 200. Tudo configurável via `.env`, sem secrets hardcoded.

**O que esta spec NÃO cobre:**
- Entidades JPA (WORK-02).
- Spring Security / autenticação (WORK-03).
- Qualquer CRUD de domínio (WORK-04+).
- Frontend (WORK-08+).
- MinIO (WORK-11).
- Rate limiting / hardening (WORK-12).

**Artefatos complementares:**
- `docs/02-development-plan.md` — plano-mãe (decisões D-01..D-15).
- `docs/01-database-modeling.md` — schema (não usado nesta fase, mas Postgres é provisionado para suportá-lo a partir da WORK-02).
- `D:\workspace\financial\CLAUDE.md` — convenções do backend.

---

## 2. System overview

**Estado atual resumido:**
- `D:\workspace\financial` tem projeto Maven Spring Boot 4.0.6 gerado via Initializr, com `FinancialApplication.java` boilerplate, `application.properties` vazio, sem `application.yml`, sem `docker-compose.yml`, sem `.env`. Compila e roda mas falha ao tentar conectar em qualquer DB (não tem datasource configurado).
- `.gitignore` existe (gerado pelo Initializr) mas não cobre `.env`.
- Sem container Postgres rodando.

**Estado alvo resumido:**
- `docker-compose.yml` na raiz do `financial` com serviço `postgres:16-alpine`. **Sem pgAdmin** — Diego usa DBeaver na host conectando em `localhost:5432`.
- `application.yml` substitui `application.properties`, com seções `spring.datasource.*`, `spring.jpa.*`, `server.*`, `logging.*`, todas via `${VAR}` placeholders.
- `.env` (gitignored) e `.env.example` (versionado) na raiz do `financial`.
- `.gitignore` atualizado para ignorar `.env`, `.env.local`, IDE files extras.
- Estrutura de packages criada vazia: `config/`, `controller/`, `dto/`, `exception/`, `mapper/`, `model/` (com subpackage `enums/`), `repository/`, `service/`.
- `HealthController` em `controller/`, expõe `GET /api/health`.
- `README.md` curto com instruções de "como subir local".
- Smoke test passa: `docker-compose up -d postgres` + `mvnw spring-boot:run` + `curl localhost:8080/api/health` → 200.

**Delta técnico:**
- 1 arquivo `docker-compose.yml` criado.
- 1 arquivo `application.yml` criado (e `application.properties` removido).
- 1 arquivo `.env` criado.
- 1 arquivo `.env.example` criado.
- `.gitignore` editado.
- 8 diretórios de package criados.
- 1 classe Java criada (`HealthController`).
- 1 `README.md` criado.

**Escopo explícito:**
Apenas os artefatos acima. Nada de código de domínio, nada de DTO, nada de security além de "não configurar nada" (Spring Security entra na WORK-03).

**Fora de escopo:**
- Spring Actuator (decidi não incluir nesta fase — `HealthController` custom é suficiente e educacional; Actuator pode entrar em WORK-12).
- Migrations (Flyway/Liquibase) — decidido em PLAN-01 D-01: usar `ddl-auto=update`.
- Configuração de CORS (vem na WORK-08 quando o front começa a chamar).
- Testes da `HealthController` — sim, incluídos no test plan (§12).

**Restrições obrigatórias:**
- Java 21, Spring Boot 4.0.6, Maven Wrapper.
- Secrets **nunca** hardcoded — sempre via env var.
- `.env` **nunca** commitado.
- Postgres rodando em container, não local nativo.
- `ddl-auto=update` (sem migrations).
- **A dependência da lib `security` NÃO deve estar no pom desta fase** — se presente, Spring Security default ativa e bloqueia tudo com 401 (não há `SecurityConfig` ainda). A dep entra na WORK-03 junto com a configuração.

---

## 3. Architecture design

**Arquitetura atual relevante:** N/A (greenfield).

**Arquitetura alvo (escopo desta fase):**

```
┌────────────────────────────────┐         JDBC
│   financial (mvnw run, host)   │ ──────────────────┐
│   :8080                        │                   │
│   GET /api/health → 200 JSON   │                   ▼
└────────────────────────────────┘         ┌─────────────────────┐
                                           │  postgres:16-alpine │
                                           │  container          │
                                           │  :5432              │
                                           │  db: financial      │
                                           │  vol: ...-data      │
                                           └─────────────────────┘
                                                     ▲
                                                     │ (opcional)
                                           ┌─────────────────────┐
                                           │  pgadmin4 :5050     │
                                           │  profile: tools     │
                                           └─────────────────────┘
```

**Principais componentes e relações nesta fase:**
- `financial` roda **na host** (via `mvnw spring-boot:run`) durante o desenvolvimento. Containerização do back vem só na WORK-10.
- `postgres` em container, expõe `5432` ao host para o app acessar via `localhost:5432`.
- Volume nomeado `financial-postgres-data` persiste o banco entre `docker-compose down`.
- `pgadmin` é opcional (profile `tools`); só sobe se chamado com `docker-compose --profile tools up`.

**Trade-offs assumidos:**
| Decisão | Trade-off |
|---|---|
| `HealthController` custom em vez de Spring Actuator | Educacional e leve, mas perde checks automáticos (DB, disk, etc.) que Actuator dá de graça. Aceito; pode evoluir em WORK-12. |
| App rodando na host durante dev (não em container) | Hot-reload da IDE, debug nativo, build mais rápido. Containerização do back vem na WORK-10. |
| `postgres:16-alpine` em vez de `postgres:16` | Imagem ~5x menor, mas Alpine usa musl libc (raríssimas incompatibilidades). Vale o tradeoff. |
| pgAdmin como profile opcional | Quem prefere DBeaver/cliente externo não precisa subir o container. |
| Sem rede `bridge` customizada no docker-compose desta fase | Default `bridge` funciona; rede nomeada entra na WORK-10 quando back+front+minio compartilharem rede. |

---

## 4. Data design

**Entidades impactadas:** nenhuma.

**Campos novos ou alterados:** nenhum.

**Regras de validação:** N/A.

**Persistência:**
- Postgres 16 (Alpine).
- Database: `financial` (criado automaticamente pela env var `POSTGRES_DB`).
- Schema padrão `public`.
- Volume nomeado `financial-postgres-data` persistindo `/var/lib/postgresql/data`.
- **Sem tabelas criadas nesta fase** — Hibernate `ddl-auto=update` está configurado mas só atua quando houver entidades JPA (WORK-02).

**Cache:** nenhum.

**Compatibilidade retroativa:** N/A (greenfield).

**Migração de dados:** N/A.

**Estratégia de leitura e escrita:** N/A nesta fase.

---

## 5. Interface design

**Interfaces internas:** N/A.

**APIs externas:**

| Método | Path | Auth | Status | Response body |
|--------|------|------|--------|---------------|
| GET | `/api/health` | nenhuma | 200 | `{"status":"UP","service":"financial","version":"0.0.1-SNAPSHOT","timestamp":"2026-05-31T14:23:00Z"}` |

**Eventos assíncronos:** nenhum.

**Formato dos payloads:** JSON (Content-Type: `application/json`).

**Erros e códigos esperados:**
| Código | Quando |
|---|---|
| 200 | `/api/health` sempre que o app está vivo. Não checa DB nesta fase (manter simples — Actuator faz isso em WORK-12 se entrar). |
| 404 | Qualquer outro path (default Spring) — sem custom handler nesta fase. |

**Autenticação ou autorização:** nenhuma nesta fase (Spring Security não está incluso ainda — vem na WORK-03). `/api/health` é, na prática, público.

**Idempotência, retry, timeout, fallback:** N/A.

---

## 6. Component design

### `CMP-01.1` HealthController
- **Responsabilidade:** expor endpoint mínimo de healthcheck para validar que o app subiu.
- **Inputs:** GET HTTP em `/api/health`.
- **Outputs:** JSON `{status, service, version, timestamp}`.
- **Estado interno:** nenhum.
- **Dependências:** nenhuma (só `OffsetDateTime` da stdlib).
- **Regras principais:** sempre retorna 200; não consulta nada externo.
- **Algoritmos ou transformações:** nenhuma.
- **Casos de falha:** se o app não subir, o endpoint nem responde — é a forma correta de "healthcheck básico". DB-aware health vem só com Actuator (futuro).
- **Arquivos previstos:** `D:\workspace\financial\src\main\java\com\financial\controller\HealthController.java`.

### `CMP-01.2` application.yml
- **Responsabilidade:** centralizar toda a configuração do Spring Boot.
- **Inputs:** lido pelo Spring na inicialização; placeholders `${VAR}` resolvidos do environment (incluindo `.env` via mecanismo descrito em §8).
- **Outputs:** beans configurados (DataSource, JPA, server, logging).
- **Estado interno:** N/A.
- **Dependências:** Postgres rodando para validar `spring.datasource.*` (mas Spring só falha em startup se `fail-fast=true`; default é tolerante).
- **Arquivo previsto:** `D:\workspace\financial\src\main\resources\application.yml`.

### `CMP-01.3` docker-compose.yml
- **Responsabilidade:** declarar serviços do ambiente local de desenvolvimento.
- **Estado interno:** volume nomeado `financial-postgres-data` persistindo dados.
- **Dependências:** Docker Desktop instalado.
- **Arquivo previsto:** `D:\workspace\financial\docker-compose.yml`.

### `CMP-01.4` Estrutura de packages
- **Responsabilidade:** organizar código futuro segundo o padrão MVC.
- **Diretórios criados (vazios, com `.gitkeep` ou pacote-info opcional):**
  - `com.financial.config`
  - `com.financial.controller` (já recebe `HealthController`)
  - `com.financial.dto`
  - `com.financial.exception`
  - `com.financial.mapper`
  - `com.financial.model`
  - `com.financial.model.enums`
  - `com.financial.repository`
  - `com.financial.service`

> **Por que criar vazio?** Para reduzir atrito nas próximas WORKs e estabelecer convenção desde já. Maven/Git não rastreia diretórios vazios — usar arquivos `package-info.java` ou `.gitkeep` para garantir persistência.

---

## 7. UI and interaction design

N/A — esta fase é 100% backend/infra. Frontend começa na WORK-08.

---

## 8. Runtime and operations

**Configuração:**

`application.yml` (versionado):
```yaml
spring:
  application:
    name: financial
  datasource:
    url: jdbc:postgresql://${POSTGRES_HOST:localhost}:${POSTGRES_PORT:5432}/${POSTGRES_DB:financial}
    username: ${POSTGRES_USER:financial}
    password: ${POSTGRES_PASSWORD}
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: update
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true
    show-sql: true
    open-in-view: false

server:
  port: ${SERVER_PORT:8080}

logging:
  level:
    com.financial: DEBUG
    org.hibernate.SQL: DEBUG
    org.hibernate.orm.jdbc.bind: TRACE
```

`.env.example` (versionado, com placeholders):
```env
# === Postgres ===
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=financial
POSTGRES_USER=financial
POSTGRES_PASSWORD=changeme

# === App ===
SERVER_PORT=8080
```

`.env` (gitignored, Diego copia de `.env.example` e ajusta valores reais).

**docker-compose.yml:**
```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: financial-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "${POSTGRES_PORT}:5432"
    volumes:
      - financial-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  financial-postgres-data:
```

> Nota: `docker-compose` lê `.env` automaticamente da mesma pasta do `docker-compose.yml` (é o comportamento padrão do Compose CLI), sem precisar declarar `env_file:` aqui. Quando o back for containerizado em WORK-10, aí sim usaremos `env_file: .env` explícito no serviço `financial`.

**.gitignore (atualizado):**
```gitignore
# Java / Maven
target/
*.class

# IDE
.idea/
.vscode/
*.iml
.eclipse/
.metadata/
.project
.classpath
.settings/
bin/

# Spring Boot
*.log
HELP.md

# Secrets
.env
.env.local
.env.*.local
*.pem
*.key

# OS
Thumbs.db
.DS_Store
```

**Feature flags:** nenhum.

**Logs:** SLF4J + Logback (default Spring Boot). Nível DEBUG para `com.financial` e `org.hibernate.SQL` em dev.

**Métricas:** nenhuma nesta fase (Actuator considerado para WORK-12).

**Alertas:** N/A.

**Monitoramento pós-release:** N/A.

**Rollout:** N/A (fase de setup local).

**Rollback:** `docker-compose down` + descartar arquivos criados se necessário.

**Recuperação ou contingência:** se o volume Postgres corromper, `docker-compose down -v` recria do zero (dados perdidos, aceitável nesta fase pois não há nada útil no banco ainda).

---

## 9. Security, privacy and compliance

**Dados sensíveis impactados:**
- Senha do Postgres (`POSTGRES_PASSWORD`) — sai do `.env`, nunca em código.
- Senha do pgAdmin (`PGADMIN_PASSWORD`) — idem.

**Regras de acesso:**
- `/api/health` é público (não há Spring Security nesta fase — entra na WORK-03).
- Postgres só aceita conexões com user/pass corretos.
- pgAdmin protegido por login.

**Controles obrigatórios:**
- `.env` nunca commitado (verificado pelo `.gitignore` desta fase).
- `.env.example` com placeholders óbvios (`changeme`) — quem clona o repo é forçado a setar valores próprios.
- Logs DEBUG em dev mostram SQL com bind params — **não usar essa config em produção**.

**Implicações de privacidade:** nenhuma (sem dados ainda).

**Requisitos regulatórios:** N/A.

---

## 10. Requirement mapping

Esta fase é **infraestrutura**, não mapeia diretamente para nenhum `REQ-XX` do plano-mãe. É **pré-requisito** de TODOS os REQs subsequentes.

---

## 11. Implementation plan input

### `WORK-01.1` Criar `.env.example` e `.env`
- **Objetivo:** secrets fora do código desde o primeiro commit.
- **Pré-requisitos:** nenhum.
- **Arquivos alvo:** `D:\workspace\financial\.env.example` (versionado), `D:\workspace\financial\.env` (gitignored).
- **Mudanças esperadas:** ambos com chaves listadas em §8.
- **Dependências:** nenhuma.
- **Pode ser paralelo:** sim com WORK-01.2.
- **Como validar:** `Get-Content .env.example` e `Get-Content .env` mostram as chaves; `.env` tem valores reais (não `changeme`).

### `WORK-01.2` Atualizar `.gitignore`
- **Objetivo:** garantir `.env` nunca seja commitado.
- **Pré-requisitos:** nenhum.
- **Arquivos alvo:** `D:\workspace\financial\.gitignore` (existente, será editado).
- **Mudanças esperadas:** adicionar bloco "Secrets" e "IDE" conforme §8.
- **Pode ser paralelo:** sim.
- **Como validar:** `git status` (quando git for inicializado) não lista `.env`.

### `WORK-01.3` Criar `docker-compose.yml`
- **Objetivo:** Postgres rodando em container, pgAdmin opcional.
- **Pré-requisitos:** Docker Desktop instalado na máquina (Diego deve validar).
- **Arquivos alvo:** `D:\workspace\financial\docker-compose.yml`.
- **Mudanças esperadas:** conteúdo de §8.
- **Dependências:** WORK-01.1 (precisa do `.env`).
- **Pode ser paralelo:** não.
- **Como validar:** `docker-compose up -d postgres` → `docker ps` mostra `financial-postgres` healthy; `docker logs financial-postgres` sem erros.

### `WORK-01.4` Substituir `application.properties` por `application.yml`
- **Objetivo:** configuração centralizada com placeholders `${VAR}`.
- **Pré-requisitos:** WORK-01.1 (precisa do `.env` para validar resolução).
- **Arquivos alvo:** **deletar** `D:\workspace\financial\src\main\resources\application.properties`; **criar** `D:\workspace\financial\src\main\resources\application.yml` com conteúdo de §8.
- **Pode ser paralelo:** sim com WORK-01.3.
- **Como validar:** `mvnw spring-boot:run` lê o yml sem erros; logs mostram `Using Postgres dialect`.

### `WORK-01.5` Criar estrutura de packages
- **Objetivo:** organização do código futuro.
- **Pré-requisitos:** nenhum.
- **Arquivos alvo:** criar 9 diretórios em `D:\workspace\financial\src\main\java\com\financial\` conforme §6 CMP-01.4. Em cada um, criar `package-info.java` mínimo para o git rastrear.
- **Pode ser paralelo:** sim.
- **Como validar:** `tree src/main/java/com/financial` mostra os 9 packages.

### `WORK-01.6` Criar `HealthController`
- **Objetivo:** endpoint mínimo para smoke test.
- **Pré-requisitos:** WORK-01.5 (precisa do package `controller`).
- **Arquivos alvo:** `D:\workspace\financial\src\main\java\com\financial\controller\HealthController.java`.
- **Mudanças esperadas:** classe com `@RestController` + `@GetMapping("/api/health")` retornando o JSON descrito em §5.
- **Dependências:** WORK-01.5.
- **Pode ser paralelo:** não.
- **Como validar:** `mvnw spring-boot:run` → `curl http://localhost:8080/api/health` → 200 com JSON contendo `"status":"UP"`.

### `WORK-01.7` Criar `README.md`
- **Objetivo:** documentar como rodar local.
- **Pré-requisitos:** WORK-01.1, 01.3, 01.4, 01.6.
- **Arquivos alvo:** `D:\workspace\financial\README.md`.
- **Conteúdo esperado:**
  ```markdown
  # financial (backend)

  Backend do sistema de controle financeiro. Veja `D:\claude\financial\docs\02-development-plan.md` para visão geral.

  ## Rodar localmente

  1. Java 21 e Docker Desktop instalados.
  2. Copiar `.env.example` → `.env` e ajustar `POSTGRES_PASSWORD` (e demais valores `changeme`).
  3. Subir o Postgres:
     ```powershell
     docker-compose up -d postgres
     ```
  4. (Opcional) Subir o pgAdmin em `http://localhost:5050`:
     ```powershell
     docker-compose --profile tools up -d
     ```
  5. Instalar lib `security` no .m2 (uma vez):
     ```powershell
     cd ..\security
     .\mvnw.cmd clean install -DskipTests
     ```
  6. Rodar o backend:
     ```powershell
     cd ..\financial
     .\mvnw.cmd spring-boot:run
     ```
  7. Smoke test:
     ```powershell
     curl http://localhost:8080/api/health
     ```
     Deve retornar 200 com JSON `{"status":"UP",...}`.
  ```
- **Pode ser paralelo:** sim.
- **Como validar:** Diego lê e consegue seguir os passos do zero.

### `WORK-01.8` Smoke test E2E manual
- **Objetivo:** validar o conjunto inteiro funcionando.
- **Pré-requisitos:** todos os anteriores.
- **Como validar:**
  1. `docker-compose down -v` (limpar estado).
  2. `docker-compose up -d postgres` → Postgres healthy em 30s.
  3. `cd D:\workspace\security && .\mvnw.cmd install -DskipTests` → BUILD SUCCESS.
  4. `cd D:\workspace\financial && .\mvnw.cmd spring-boot:run` → app sobe sem ERROR, log "Started FinancialApplication in X seconds".
  5. `curl -s http://localhost:8080/api/health` → JSON com `status=UP`.
  6. `docker-compose --profile tools up -d` → pgAdmin em `http://localhost:5050`, login com `PGADMIN_EMAIL` / `PGADMIN_PASSWORD`, adiciona conexão com host `host.docker.internal:5432`, vê o database `financial` vazio.

---

## 12. Test plan

- **Testes unitários:**
  - `HealthControllerTest` (Spring Boot Test + `@WebMvcTest`): GET `/api/health` → status 200 + JSON com chave `status=UP`.
- **Testes de widget ou UI:** N/A.
- **Testes de integração:** não há nesta fase — a única lógica é o `HealthController`, coberta pelo unit. Testcontainers entra na WORK-02.
- **Testes de contrato:** N/A.
- **Testes manuais:** smoke test descrito em WORK-01.8.
- **Regressões obrigatórias:** rodar `mvnw test` antes de fechar a fase — deve passar o teste do `HealthController`.

---

## 13. Open items

**Bloqueios:** nenhum.

**Riscos:**
| Risco | Mitigação |
|---|---|
| Docker Desktop não instalado/parado na máquina do Diego | Validar no smoke test (passo 2 do README); se faltar, instalar `docker-desktop` via winget. |
| Porta 5432 já ocupada por Postgres local | Mudar `POSTGRES_PORT` no `.env` para algo livre (ex: `15432`). |
| Porta 8080 já ocupada por outra app | Mudar `SERVER_PORT` no `.env` para 8081 ou similar. |

**Decisões pendentes (a confirmar antes ou durante a implementação):**

| # | Decisão | Recomendação |
|---|---------|--------------|
| O-01 | Onde inicializar o git? Monorepo em `D:\workspace`? Ou `git init` separado em `financial` e `security`? | **Repositórios separados** — `financial` e `security` são deployáveis independentes; cada um com seu git. Workspace `D:\claude\financial` não vira repo (só contém junctions). |
| O-02 | Incluir `pgadmin` no docker-compose ou recomendar DBeaver/cliente externo? | **Incluir como profile opcional** (`--profile tools`). Quem prefere externo não paga o custo de subir o container. |
| O-03 | `package-info.java` ou `.gitkeep` para packages vazios? | **`package-info.java`** (idiomatic Java; pode receber Javadoc futuro). |
| O-04 | `HealthController` retorna `Map<String, Object>` ou DTO específico (`HealthResponse`)? | **DTO record** — `public record HealthResponse(String status, String service, String version, String timestamp) {}`. Type-safe, futureproof, exemplifica padrão que será usado em todos os endpoints. |
| O-05 | Endpoint `/api/health` ou `/health`? | **`/api/health`** — alinhado com a convenção `/api/**` definida em PLAN-01 §5. |

**Assunções temporárias:**
- Diego tem Docker Desktop instalado e rodando (a confirmar antes de implementar).
- A porta 5432 está livre (a confirmar no smoke test).
- A porta 8080 está livre.

---

## Critério de "pronto" (resumo executável)

```
[ ] .env.example criado e versionado
[ ] .env criado, gitignored, com valores reais
[ ] .gitignore atualizado (ignora .env)
[ ] docker-compose.yml criado, postgres healthy
[ ] application.yml substitui application.properties
[ ] 9 packages criados com package-info.java
[ ] HealthController retorna 200 com JSON {status:UP,...}
[ ] README.md descreve os passos de subida
[ ] HealthControllerTest passa
[ ] Smoke test E2E manual (WORK-01.8) bem-sucedido
[ ] Diego revisa o resultado e aprova explicitamente
```

> Após Diego aprovar (último item), Claude marca `[x]` nas 3 colunas da tabela-resumo da §11 do plano-mãe (spec criada / implementada / aprovada).
