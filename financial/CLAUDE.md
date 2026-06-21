# CLAUDE.md — Projeto `financial` (backend)

Backend Spring Boot do sistema **financial**. Para contexto geral do workspace (fluxo SDD, decisões transversais), leia `D:\claude\financial\CLAUDE.md` primeiro.

## Identidade

- **Group:** `com.financial`
- **Artifact:** `financial`
- **Version:** `0.0.1-SNAPSHOT`
- **Tipo:** Spring Boot application (executável, `mvnw spring-boot:run`)
- **Main class:** `com.financial.FinancialApplication`

## Stack

| Tecnologia | Versão | Para quê |
|---|---|---|
| Java | 21 LTS (Temurin) | runtime |
| Spring Boot | **4.0.6** (sem `.RELEASE`) | framework |
| Spring Web MVC | starter `spring-boot-starter-webmvc` | REST APIs |
| Spring Data JPA | starter | ORM |
| Spring Validation | starter | bean validation |
| PostgreSQL JDBC | runtime | DB driver |
| Lombok | annotation processor | boilerplate |
| Lib `security` | `com.financial.security:security:0.0.1-SNAPSHOT` | JWT + filters + BCrypt — resolvida via `.m2` local |

## Build

```powershell
# Sempre rodar PRIMEIRO no projeto security (publica no .m2):
cd D:\workspace\security
.\mvnw.cmd clean install -DskipTests

# Depois aqui:
cd D:\workspace\financial
.\mvnw.cmd clean compile          # validar
.\mvnw.cmd spring-boot:run        # rodar
.\mvnw.cmd clean package          # gerar fat jar em target/
```

## Estrutura de packages (planejada — definida no WORK-01)

```
com.financial
├── FinancialApplication.java      ← main, @SpringBootApplication
├── config/                        ← @Configuration beans (CORS, OpenAPI, etc)
├── controller/                    ← REST @RestController, agrupados por agregado
├── dto/                           ← Request/Response DTOs (separados das entities)
├── exception/                     ← @ControllerAdvice + custom exceptions
├── mapper/                        ← Entity ↔ DTO (MapStruct ou manual — definir no WORK-04)
├── model/                         ← entidades JPA
│   ├── BaseEntity.java            ← id UUID + created/updated_date
│   ├── enums/                     ← ExpenseType, ExpenseStatus, InstallmentStatus
│   └── *.java                     ← User, BankAccount, Expense, Installment, ...
├── repository/                    ← Spring Data JPA Repositories
└── service/                       ← regras de negócio (todas aqui, não no controller)
```

**Regra de ouro:** controller é "burro" (recebe DTO, chama service, retorna DTO). Toda regra está em `service`.

## Configuração (`application.yml` — a criar no WORK-01)

Configurações virão de:
- `spring.datasource.*` — Postgres local via docker-compose
- `spring.jpa.hibernate.ddl-auto=update` — **NUNCA mudar para `create-drop` em dev** (apaga dados toda subida)
- `jwt.secret`, `jwt.expiration-hours` — consumido pela lib `security`
- `server.port=8080`
- `cors.allowed-origins` — origin do front

## Padrões de código

- **Sem comentários óbvios.** Nome de método/classe deve explicar. Comentário só pra justificar o porquê de algo não óbvio.
- **Sem JPA leak para fora do service.** Controllers e front nunca recebem entity, sempre DTO.
- **Validação na entrada:** `@Valid` no controller + Jakarta annotations no DTO.
- **Exceptions:** lançar exceções customizadas no service; `@ControllerAdvice` traduz para HTTP + payload de erro padronizado (formato em `docs/02-development-plan.md` §5).
- **Isolamento por user:** TODO service que lê/escreve dados de domínio extrai `user_id` do `SecurityContext` e filtra/seta. Nunca confiar em `user_id` vindo do payload.
- **Soft-delete:** DELETE no banco é proibido; usar flag `active=false` ou `status=CANCELLED`.

## Estado atual

- Projeto gerado via Spring Initializr (Boot 4.0.6, Java 21, web/jpa/validation/lombok/postgresql).
- Pom já editado: versão corrigida (`4.0.6`, não `.RELEASE`), dependência da lib `security` adicionada.
- `FinancialApplication.java` é o boilerplate default — nada implementado ainda.
- **Próximo trabalho:** ver `D:\claude\financial\docs\02-development-plan.md` — WORK-01 é a fase atual.

## Notas Spring Boot 4.x

- Starter `spring-boot-starter-web` virou `spring-boot-starter-webmvc`.
- Test starters seguem o mesmo padrão: `spring-boot-starter-webmvc-test`, `spring-boot-starter-data-jpa-test`, etc.
- `javax.*` → `jakarta.*` (já era no Boot 3.x, consolidado no 4.x).
- Se um doc/tutorial usar nomes antigos, traduzir mentalmente.
