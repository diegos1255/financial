# Plano de Desenvolvimento — Sistema `financial`

> Documento preenchido seguindo o template `04-development-spec-system-design-template.md` (Variant A — System Design Spec).
> Este é o **plano-mãe** do projeto. Cada `WORK-XX` da seção 11 vai virar uma **spec própria** usando o mesmo template, com profundidade no escopo da fase.

---

## Metadados

- **spec_id:** `PLAN-01`
- **titulo_tecnico:** Plano de Desenvolvimento — Sistema Financial (MVP de controle financeiro pessoal com fluxo Spec-Driven)
- **source_product_spec:** N/A (requisitos foram coletados conversacionalmente — registrados em [[project-financial]] e refletidos na seção 10 deste plano)
- **source_product_spec_version:** v1 — 2026-05-31
- **baseline_branch_or_commit:** N/A (projeto greenfield, sem repositório git ainda)
- **target_branch:** `main` (a criar)
- **escopo_sistema:** três projetos coordenados — `financial` (backend Spring Boot), `security` (lib Maven JAR para auth) e `financial-front` (SPA React)
- **última_atualização:** 2026-05-31

---

## 1. Objective do documento

**O que esta spec técnica precisa permitir que engenharia faça:**
Executar do zero, do ambiente até o sistema rodando em docker-compose, todas as funcionalidades do MVP — login, CRUDs de categoria/conta/salário/despesa/investimento, dashboard com saldo mensal e gráfico de despesas — em sequência de fases (`WORK-XX`) que viram specs próprias e detalhadas antes da implementação.

**O que esta spec não cobre:**
- Detalhamento técnico de cada fase (vive na spec própria de cada `WORK-XX`).
- Schema do banco (já formalizado em `docs/01-database-modeling.md`).
- Decisões de UX visual fora do layout estrutural (não há Figma — design é "burro", funcional).
- Hardening de produção, observabilidade avançada, multi-tenancy real com RBAC, signup público, upload binário, integração com APIs externas (cotação de ativos, etc.).

**Artefatos complementares:**
- `docs/01-database-modeling.md` — modelagem completa do schema, regras transversais, diagrama ER.
- `04-development-spec-system-design-template.md` — template seguido neste documento e em cada spec futura.
- Memória persistente do Claude em `~/.claude/projects/D--claude-financial/memory/` — decisões já consolidadas.
- Futuras specs em `docs/specs/phase-XX-*.md`.

---

## 2. System overview

**Estado atual resumido:**
- Workspace local em `D:\workspace\` com dois projetos Maven gerados via Spring Initializr: `financial` (app Spring Boot 4.0.6) e `security` (lib JAR).
- `security` instalada no `.m2` local; `financial` declara dependência e compila resolvendo-a.
- Sem código de domínio, sem entidades, sem controllers, sem configuração de DB.
- Sem repositório git, sem CI, sem containers além dos planejados.
- Java 21 Temurin + Maven Wrapper validados.

**Estado alvo resumido:**
- Sistema completo MVP rodando localmente via `docker-compose up` com 3 serviços (back, front, postgres).
- Login funcional com JWT, endpoints REST autenticados, todas as funcionalidades CRUD implementadas, dashboard com agregação mensal, frontend SPA com menu lateral.

**Delta técnico (alto nível):**
- Implementar 8 entidades JPA + repositórios + serviços + controllers REST.
- Implementar lib `security` (geração/validação JWT, filtros, `SecurityConfig`, `PasswordEncoder` BCrypt, `UserDetailsService`).
- Implementar frontend React + Vite + TypeScript + Tailwind + Recharts (pizza).
- Containerizar back, front e DB.

**Escopo explícito:**
As 11 funcionalidades originais do Diego, formalizadas em `REQ-01..REQ-11` (seção 10).

**Fora de escopo:**
- Recuperação de senha, 2FA, OAuth social.
- Integração com brokers ou APIs de cotação.
- Mobile responsive ou app nativo.
- Multi-tenancy/RBAC além do isolamento por `user_id`.
- Funcionalidade "adiantar parcela" (estrutura de dados pronta, regra de negócio em spec separada pós-WORK-06 — ver D-02 na seção 13).

**Incluído no escopo (alterações pós-decisões):**
- Cadastro público de usuário (signup) com endpoint `POST /api/auth/signup` e tela própria no front.
- Upload de foto de perfil para storage S3-compatível (**MinIO** em container, no docker-compose).
- Tabela `menus` no banco com flag `active`, populada via `data.sql` (sem CRUD admin); front consome via `GET /api/menus`.

**Restrições obrigatórias:**
- **Sem migrations** (Flyway/Liquibase) — schema gerenciado por Hibernate `ddl-auto=update`. Trade-off aceito por se tratar de projeto educacional.
- Regras de negócio 100% no backend; frontend não decide nada, apenas renderiza.
- Soft-delete sempre — registros marcados como inativos/cancelados, nunca apagados fisicamente.
- Fluxo de desenvolvimento estrito: **plano → aprovação → spec por fase → aprovação → implementação** (ver [[feedback-workflow]]).

---

## 3. Architecture design

**Arquitetura atual relevante:** N/A (greenfield).

**Arquitetura alvo:**
Três camadas físicas, MVC clássico no backend, SPA no frontend.

```
┌─────────────────────┐     HTTPS/HTTP      ┌──────────────────────────┐
│  financial-front    │ ──────JSON─────▶    │     financial (back)     │
│  React + Vite + TS  │   Bearer JWT        │  Spring Boot 4.0.6       │
│  Tailwind + Recharts│ ◀───JSON─────       │  ┌─────────────────────┐ │
└─────────────────────┘  multipart upload   │  │ security (JAR lib)   │ │
                                            │  │ JWT + Filters +      │ │
                                            │  │ BCrypt + Config      │ │
                                            │  └─────────────────────┘ │
                                            │  Controller→Service→     │
                                            │  Repository→Entity (JPA) │
                                            └─────┬───────────┬────────┘
                                            JDBC  │           │ S3 SDK
                                                  ▼           ▼
                                      ┌────────────────┐ ┌───────────────────┐
                                      │ PostgreSQL 16  │ │ MinIO (container) │
                                      │ (container)    │ │ bucket: avatars   │
                                      └────────────────┘ └───────────────────┘
```

**Principais componentes e relações:**
- `financial-front` consome a API REST do `financial` (JSON + upload multipart para foto).
- `financial` depende em tempo de build da lib `security` (resolvida via `.m2`); em runtime ambos formam um único processo JVM.
- `financial` conecta no `postgres` via JDBC e no `minio` via AWS S3 SDK (S3-compatible).
- Em produção/docker-compose: `nginx` (servindo o front) + JVM do `financial` + container postgres + container minio.

**Diagrama de contexto:** acima.

**Trade-offs assumidos:**
| Decisão | Trade-off |
|---|---|
| `ddl-auto=update` em vez de migrations | Simplifica setup e aprendizado, mas perde controle granular do schema e dificulta rollback futuro. |
| Lib `security` como projeto Maven separado | Mais coerente arquiteturalmente e exercita modularização, ao custo de duplo build (`security install` antes de `financial`). |
| Frontend "burro" (regras no back) | Reduz duplicação de validação, mas exige sempre roundtrip pro back, sem validação local imediata. |
| Sem cache (Redis) | Dispensável no MVP; performance é não-issue. |
| User_id em todas as tabelas mesmo sendo monousuário | Custo zero agora, evita refactor caro depois. |
| Menus em banco (sem CRUD admin, seed via `data.sql`) | Confirmado pelo Diego — permite habilitar/desabilitar via SQL sem rebuild do front. |

---

## 4. Data design

**Entidades impactadas:** 8 (todas novas).

| Entidade | Tabela | Resumo |
|---|---|---|
| User | `users` | Login (BCrypt), nome, foto-URL (gerada pelo MinIO no upload), soft-delete. |
| BankAccount | `bank_accounts` | Conta bancária (Nubank etc.), por user. |
| ExpenseCategory | `expense_categories` | Categorias de despesa, por user. |
| Salary | `salaries` | Salário por competência (mês/ano), 1 por user/competência. |
| Expense | `expenses` | Despesa FIXED ou INSTALLMENT, com categoria e bank_account. |
| Installment | `installments` | Parcelas individuais de uma Expense INSTALLMENT. |
| Investment | `investments` | Carteira: ticker + qtd cotas (INTEGER) + preço. |
| Menu | `menus` | Itens do menu lateral, global (sem user_id), com `active`. Populado via `data.sql`. |

**Campos novos ou alterados, regras de validação, persistência, compatibilidade retroativa, migração:**
→ Referência única: `docs/01-database-modeling.md`. Esta seção não duplica.

**Cache:** nenhum.

**Estratégia de leitura e escrita:**
- Escrita: Spring Data JPA `save()` em transações de serviço (`@Transactional`).
- Leitura: `Repository` methods com Specifications/JPQL para filtros (ex: `findByUserIdAndYearAndMonth`).
- Dashboard: queries de agregação dedicadas com JPQL `GROUP BY` (não calcular em memória).

---

## 5. Interface design

**Interfaces internas:**
Camadas no `financial`: `Controller → Service → Repository`. DTOs separados de Entities (sem expor JPA na API). Mapeamento via **MapStruct** (decisão D-06).

**Política de autenticação (regra dura):**
- **Únicos endpoints públicos:** `POST /api/auth/login`, `POST /api/auth/signup`, `GET /api/health`.
- **Todo o resto** (`/api/menus`, `/api/users/**`, `/api/categories/**`, `/api/bank-accounts/**`, `/api/salaries/**`, `/api/expenses/**`, `/api/investments/**`, `/api/dashboard/**`) exige `Authorization: Bearer <token>` válido.
- Token ausente, inválido ou expirado → **401** com payload `{code: "UNAUTHORIZED" | "TOKEN_EXPIRED", message: "..."}`.
- Front intercepta 401 e renderiza tela amigável (ver seção 7).

**APIs externas (REST):**

| Path prefix | Auth | Descrição |
|---|---|---|
| `POST /api/auth/login` | nenhuma | Recebe `{login, password}`, retorna `{token, user}`. |
| `POST /api/auth/signup` | nenhuma | Cadastro público: `{name, login, password}` (multipart opcional com `photo`); retorna `{token, user}`. |
| `GET /api/health` | nenhuma | Healthcheck. |
| `GET /api/menus` | Bearer JWT | Lista menus com `active=true`, ordenados por `sort_order`, com hierarquia. |
| `POST /api/users/me/photo` | Bearer JWT | Upload multipart (JPG/PNG, máx 2MB). Substitui foto atual no MinIO. |
| `GET/POST/PUT/DELETE /api/categories/**` | Bearer JWT | CRUD ExpenseCategory. |
| `GET/POST/PUT/DELETE /api/bank-accounts/**` | Bearer JWT | CRUD BankAccount. |
| `GET/POST/PUT/DELETE /api/salaries/**` | Bearer JWT | CRUD Salary. |
| `GET/POST/PUT/DELETE /api/expenses/**` | Bearer JWT | CRUD Expense + ação cancel. |
| `GET/POST/PUT/DELETE /api/investments/**` | Bearer JWT | CRUD Investment. |
| `GET /api/dashboard/balance?year=&month=` | Bearer JWT | Saldo do mês. |
| `GET /api/dashboard/expenses-by-category?year=&month=` | Bearer JWT | Agregação para gráfico pizza. |

**Eventos assíncronos:** nenhum.

**Formato dos payloads:** JSON (Content-Type: `application/json`). Datas em ISO-8601. Valores monetários como `number` (com 2 casas) ou `string` decimal — definir na spec da fase 4.

**Erros e códigos esperados:**
| Código | Quando |
|---|---|
| 200 | OK em GET/PUT/DELETE |
| 201 | Created em POST |
| 400 | Payload mal formado |
| 401 | Sem token ou token inválido/expirado |
| 403 | Token válido mas sem permissão (futuro) |
| 404 | Recurso não encontrado ou pertence a outro user |
| 409 | Conflito (ex: salário duplicado na mesma competência, UNIQUE violation) |
| 422 | Validação de domínio falhou (ex: INSTALLMENT sem installments_count) |
| 500 | Erro interno (logado, mascarado na resposta) |

**Formato de erro:** `{ "timestamp": "...", "status": 422, "code": "INVALID_EXPENSE_TYPE", "message": "...", "fieldErrors": [{"field":"installmentsCount","message":"..."}] }`

**Autenticação ou autorização:** JWT HS256 emitido no login (expiração 8h, configurável). Header `Authorization: Bearer <token>`. Filtros do `security` validam em todas as rotas exceto `/api/auth/**` e `/api/health`.

**Idempotência, retry, timeout, fallback:** não aplicado nesta versão (chamadas síncronas simples, sem fila).

---

## 6. Component design

### `CMP-01` financial-app
- **Responsabilidade:** API REST de domínio + orquestração de regras de negócio.
- **Inputs:** requisições HTTP REST do front.
- **Outputs:** respostas JSON.
- **Estado interno:** nenhum em memória — fonte de verdade no postgres.
- **Dependências:** lib `security` (auth), `postgres` (persistência), `spring-boot-starter-{webmvc, data-jpa, validation}`, `lombok`, driver PostgreSQL.
- **Regras principais:** todas as regras de negócio do domínio (cálculo dashboard, geração de installments, cancelamento em cascata, unicidade de salário, soft-delete).
- **Casos de falha:** DB indisponível (500 + retry pelo front), JWT inválido (401), validação (422), conflito (409).
- **Arquivos ou módulos previstos:** estrutura de pacotes definida na fase 1 (`com.financial.{config, controller, dto, model, repository, service, exception, mapper}`).

### `CMP-02` security-lib
- **Responsabilidade:** Gerar e validar JWT, expor `SecurityFilterChain` configurada, `PasswordEncoder` (BCrypt), `JwtAuthenticationFilter`, base para `UserDetailsService` (interface — implementação do consumidor).
- **Inputs:** credenciais de login (via consumidor), tokens nas requisições.
- **Outputs:** tokens assinados, decisões de autenticação.
- **Estado interno:** nenhum (stateless).
- **Dependências:** `spring-boot-starter-security`, `spring-boot-starter-webmvc`, `jjwt 0.12.6`.
- **Regras principais:** assinatura HS256, expiração configurável, leitura do `Authorization` header, popula `SecurityContext`.
- **Casos de falha:** token expirado/inválido → 401; falha de assinatura → 401; absent header → 401 (exceto rotas públicas).
- **Arquivos ou módulos previstos:** `com.financial.security.{config, filter, jwt, service, exception}`.

### `CMP-03` financial-front
- **Responsabilidade:** SPA que renderiza dados e dispara ações; zero regra de negócio.
- **Inputs:** interação do usuário, respostas da API.
- **Outputs:** chamadas HTTP, renderização.
- **Estado interno:** JWT em `localStorage`, estado de UI em React (zustand/context — decisão na spec da fase 8).
- **Dependências:** React 18+, Vite, TypeScript, Tailwind, React Router, Axios, Recharts.
- **Regras principais:** interceptor Axios para anexar JWT, redirect para login em 401, validação de formulário (apenas presença/formato — domínio é do back).
- **Casos de falha:** offline → toast de erro; 401 → logout; 422 → exibe `fieldErrors` no form.
- **Arquivos ou módulos previstos:** estrutura definida na fase 8.

### `CMP-04` postgres-db
- **Responsabilidade:** persistência relacional.
- **Inputs:** queries SQL via JDBC.
- **Outputs:** resultsets.
- **Estado interno:** schema gerenciado por Hibernate na primeira subida.
- **Dependências:** nenhuma.
- **Regras principais:** referencial integrity (FKs), CHECK constraints, UNIQUE.
- **Casos de falha:** disk full, conexão recusada → app retorna 500.
- **Arquivos previstos:** apenas configuração de container (fase 1).

### `CMP-05` minio-storage
- **Responsabilidade:** storage S3-compatível para fotos de perfil.
- **Inputs:** PUT object via AWS S3 SDK (upload de foto), GET object (front exibe via URL).
- **Outputs:** URLs presigned ou públicas para o front renderizar `<img>`.
- **Estado interno:** bucket `avatars` (criado na primeira subida via init script ou pelo próprio app).
- **Dependências:** nenhuma (auto-suficiente).
- **Regras principais:** validar Content-Type (image/jpeg, image/png), tamanho máx 2MB. Nome do objeto: `users/{user_id}/avatar.{ext}` (sobrescrita em re-upload).
- **Casos de falha:** MinIO down → upload falha com 503, dashboard ainda funciona (foto vira placeholder no front).
- **Arquivos previstos:** Service `PhotoStorageService` no `financial` (encapsula AWS SDK), config de credenciais via env var; container no docker-compose com volume persistente.

---

## 7. UI and interaction design

**Telas alteradas / criadas:**
- **Públicas (sem autenticação):**
  - Tela de login (centralizada) com link "Cadastre-se".
  - Tela de signup (centralizada) com formulário (name, login, senha, confirmar senha, upload de foto opcional).
  - Tela "Você precisa fazer login" (amigável, com botão "Ir para Login") — exibida quando route guard bloqueia URL forçada sem token.
  - Tela "Sua sessão expirou" (amigável, com botão "Fazer Login novamente") — exibida quando interceptor Axios recebe 401 com `code: TOKEN_EXPIRED`.
- **Protegidas (exigem JWT):**
  - Layout autenticado: menu lateral fixo (esquerda, **carregado do `GET /api/menus`**) + área de conteúdo (direita) + avatar do usuário no topo + botão "Sair".
  - Páginas: Dashboard, Categorias, Contas Bancárias, Salários, Despesas, Investimentos.

**Componentes novos:** botão, input, select, table genérica, modal de confirmação, form com validação, card de KPI, chart pizza, **uploader de imagem** (drag-drop ou click, com preview e validação client-side de tipo/tamanho).

**Componentes alterados:** N/A (greenfield).

**Estados visuais:** loading (spinner), vazio (mensagem amigável), erro (toast vermelho), sucesso (toast verde), disabled (opacity reduzida).

**Navegação:** React Router com **route guards** em duas camadas:
1. **Guard de rota** — antes de renderizar uma página protegida, verifica se há JWT no localStorage. Se não houver, redireciona para `/unauthorized` (tela "Você precisa fazer login").
2. **Interceptor Axios global** — após qualquer chamada que retorne 401, limpa token e redireciona para `/session-expired` (tela "Sua sessão expirou"). Distingue de "nunca logou" para mensagem mais apropriada.

Comportamento contra "forçar URL na mão": tentar abrir `/dashboard` sem token → route guard captura → tela amigável (não tela em branco, não erro, não 404).

**Responsividade:** desktop-first (≥1024px). Mobile fora de escopo.

**Acessibilidade:** labels em todos os inputs, contraste WCAG AA, foco visível em interativos, navegação por teclado básica.

**Regras de conteúdo:** valores monetários em formato BR (`R$ 1.234,56`), datas em `dd/MM/yyyy`, timezone do navegador.

---

## 8. Runtime and operations

**Configuração:** `application.yml` no `financial` com sections `spring.datasource.*`, `spring.jpa.*`, `jwt.secret`, `jwt.expiration-hours`, `server.port`, `cors.allowed-origins`, `storage.minio.*`. **Todos os valores sensíveis (senha do DB, JWT secret, MinIO root password, etc.) vêm de variáveis de ambiente via placeholders `${VAR_NAME}`**.

**Gestão de secrets (decisão D-13):**
- Arquivo `.env` na raiz do workspace, **listado no `.gitignore`** — não vai para repositório.
- Arquivo `.env.example` versionado, com placeholders e exemplos (`POSTGRES_PASSWORD=changeme`).
- `docker-compose.yml` usa `env_file: .env` para injetar nos containers.
- Em dev local (rodando via IDE), Diego configura as env vars no run-config do Eclipse ou copia o `.env` para `application-local.yml`.
- Spring Boot resolve `${POSTGRES_PASSWORD}` automaticamente em qualquer ponto do `application.yml`.

**Feature flags:** nenhum.

**Logs:** SLF4J + Logback (default Spring Boot). Nível INFO em prod, DEBUG em dev. Não logar senha nem JWT.

**Métricas:** `spring-boot-starter-actuator` com endpoints `/actuator/health` e `/actuator/info` apenas (sem Prometheus nesta versão).

**Alertas:** N/A (projeto educacional).

**Monitoramento pós-release:** N/A.

**Rollout:** `docker-compose up -d --build` na fase 10.

**Rollback:** `docker-compose down` + checkout commit anterior + rebuild.

**Recuperação ou contingência:** snapshot manual do volume postgres antes de mudanças críticas.

---

## 9. Security, privacy and compliance

**Dados sensíveis impactados:**
- Senha do usuário → armazenada como hash BCrypt (**strength 10**, default Spring).
- JWT secret → variável de ambiente, nunca commitado. Expiração: **8 horas**.
- Dados financeiros pessoais → não há regulação aplicável neste projeto educacional, mas tratamento equivalente a "confidencial".
- Foto de perfil no MinIO → bucket privado; URL pra exibição é gerada presigned (curta duração) pelo back.

**Regras de acesso (proteção total — regra dura):**
- Todos os endpoints `/api/**` **exceto** `POST /api/auth/login`, `POST /api/auth/signup` e `GET /api/health` requerem JWT válido. Não há exceção implícita.
- Whitelist explícita no `SecurityFilterChain` do `security` — qualquer endpoint novo nasce protegido por default.
- Filtros do `security` populam `SecurityContext`; serviços extraem `user_id` do contexto e **sempre filtram queries por ele** (isolamento por usuário).
- Tentativa de acesso a rota protegida sem token / com token inválido / com token expirado → **401** com payload distinguindo o motivo (`UNAUTHORIZED` vs `TOKEN_EXPIRED`) para o front exibir tela amigável apropriada.
- Front protege URLs forçadas via route guard (ver seção 7) — não basta proteger no back, a UX precisa ser amigável.
- DELETE físico nunca exposto; apenas soft-delete via `active=false` ou `status='CANCELLED'`.

**Política de senha (signup):**
- Mínimo **10 caracteres**.
- Deve conter: **letra minúscula**, **letra maiúscula**, **número**, **caractere especial**.
- Validada em duas camadas: client-side (UX) e server-side (definitiva — fonte de verdade).
- Erros retornam código `WEAK_PASSWORD` com lista de regras não atendidas em `fieldErrors`.

**Controles obrigatórios:**
- Senha nunca aparece em logs ou responses (filtro do Lombok `@JsonIgnore` na entidade User).
- JWT assinado HS256 com secret ≥ 32 bytes.
- CORS restrito ao origin do front (configurável).
- Headers de segurança via Spring Security defaults (X-Content-Type-Options, X-Frame-Options).
- Upload de foto valida MIME (image/jpeg, image/png), tamanho (≤ 2MB) e magic bytes (servidor não confia em extensão).

**Implicações de privacidade:** dados financeiros locais, sem compartilhamento com terceiros.

**Requisitos regulatórios:** nenhum (educacional).

---

## 10. Requirement mapping

### `REQ-01` Login
- **source_requirement:** "Login: acesso via login. Tabela com uuid, name, login, created/updated_date, active, photo."
- **Interpretação técnica:** entidade `User`, BCrypt na senha (strength 10), endpoint `POST /api/auth/login`, JWT no retorno (expira em 8h).
- **Touchpoints:** `CMP-01` (UserRepository, AuthController), `CMP-02` (JwtProvider, SecurityConfig), `CMP-03` (tela login).
- **Contratos impactados:** `POST /api/auth/login`.
- **Estados impactados:** sessão do front (JWT em localStorage).
- **Critério de aceite técnico:** credenciais válidas → 200 + JWT; inválidas → 401; usuário `active=false` → 401.
- **Testes:** unit (UserService), integração (login E2E via Testcontainers), manual (Postman).
- **Open questions:** nenhuma.

### `REQ-02` Cadastro de Categoria de despesa
- **source_requirement:** "Cadastro de categoria da conta" (interpretado como categoria de despesa, ver seção 3.3 de `01-database-modeling.md`).
- **Interpretação técnica:** CRUD completo de `ExpenseCategory`, soft-delete via `active`.
- **Touchpoints:** `CMP-01` (CategoryController/Service/Repo), `CMP-03` (tela de categorias).
- **Contratos impactados:** `/api/categories/**`.
- **Critério de aceite técnico:** CRUD funcional + UNIQUE(user_id, name) respeitado.

### `REQ-03` Cadastro de Salário por competência
- **source_requirement:** "Cadastro de salário... atrelado a uma conta".
- **Interpretação técnica:** entidade `Salary` com `(reference_month, reference_year)` e FK para `BankAccount`. UNIQUE(user, year, month).
- **Touchpoints:** `CMP-01`, `CMP-03`.
- **Contratos impactados:** `/api/salaries/**`.
- **Critério de aceite técnico:** cadastro duplo na mesma competência → 409.

### `REQ-04` Cadastro de Despesa (FIXED ou INSTALLMENT)
- **source_requirement:** "Cadastro de despesas atrelado a uma categoria e que vai ser debitada da conta do salário... fixa ou parcelada... cancelar... adiantar parcela... nunca excluir fisicamente."
- **Interpretação técnica:** entidade `Expense` + `Installment`, geração automática de parcelas na criação INSTALLMENT, ação `cancel` (soft + cascata para parcelas pendentes).
- **Touchpoints:** `CMP-01` (ExpenseService com lógica de geração), `CMP-03` (tela com modal de cancelar).
- **Contratos impactados:** `/api/expenses/**`, `POST /api/expenses/{id}/cancel`.
- **Critério de aceite técnico:** criar INSTALLMENT 10x R$100 gera 10 linhas em `installments`; cancelar zera as pendentes mas preserva pagas; "adiantar parcela" não implementado neste plano (open item).

### `REQ-05` Cadastro de Conta Bancária
- **source_requirement:** "Cadastro de Conta de onde vem o dinheiro do salário, ex: Nubank."
- **Interpretação técnica:** CRUD de `BankAccount`, soft-delete.
- **Contratos impactados:** `/api/bank-accounts/**`.

### `REQ-06` Cadastro de Investimentos
- **source_requirement:** "Carteira de investimentos: código, qtd cotas, valor cota. Ex MXRF11 300 cotas R$ 9,50."
- **Interpretação técnica:** CRUD de `Investment`, valor da cota informado manualmente.
- **Contratos impactados:** `/api/investments/**`.

### `REQ-07` Dashboard com saldo
- **source_requirement:** "Dashboard que mostra saldo restante (salário - total de contas)."
- **Interpretação técnica:** endpoint de agregação `/api/dashboard/balance?year=&month=` retornando `{salary, totalExpenses, balance}`. Cálculo conforme seção 4 do `01-database-modeling.md`.
- **Contratos impactados:** `/api/dashboard/balance`.

### `REQ-08` Gráfico pizza de despesas mensais
- **source_requirement:** "Gráfico das despesas mensais em pizza."
- **Interpretação técnica:** `/api/dashboard/expenses-by-category?year=&month=` retornando lista `{categoryName, total}`. Renderização com Recharts no front.

### `REQ-09` Layout com menu lateral
- **source_requirement:** "Layout simples fluido, menu lateral, telas renderizadas no lado direito."
- **Interpretação técnica:** layout React com `<Sidebar>` fixo + `<Outlet>` do React Router à direita.

### `REQ-10` Menus em banco
- **source_requirement:** "Cadastrar os menus no banco de dados."
- **Interpretação técnica:** tabela `menus` com `id, parent_id, label, route, icon, sort_order, active`. Populada via `data.sql` no startup. Endpoint `GET /api/menus` retorna árvore com `active=true`. Sem CRUD admin nesta versão (Diego edita via SQL direto se precisar). Habilitar/desabilitar = trocar `active` no banco.
- **Touchpoints:** `CMP-01` (Menu entity, MenuRepository, MenuController), `CMP-03` (Sidebar consome endpoint, renderiza recursivamente).
- **Contratos impactados:** `GET /api/menus`.
- **Critério de aceite técnico:** seed insere N menus; ao subir o app, `GET /api/menus` retorna lista ordenada por `sort_order`; alterar `active=false` no banco remove o item da resposta sem rebuild.

### `REQ-11` Frontend React
- **source_requirement:** "Front você pode definir, mas queria algo entre react ou Angular. Prefiro react pelo tailwind."
- **Interpretação técnica:** React 18 + Vite + TypeScript + Tailwind + React Router + Axios + Recharts.

### `REQ-12` Signup público + upload de foto de perfil
- **source_requirement:** "Tela de login com botão 'cadastre-se' que leva para tela de cadastro com upload de foto. Storage S3-like gratuito."
- **Interpretação técnica:**
  - Endpoint `POST /api/auth/signup` aceita `{name, login, password}` (JSON) **ou** multipart com campo `photo` opcional (JPG/PNG, ≤ 2MB).
  - Cria `User` com BCrypt, faz upload no MinIO em `users/{user_id}/avatar.{ext}` se houver foto, atualiza `users.photo_url` com URL presigned ou path interno.
  - Retorna `{token, user}` igual ao login (auto-login pós-signup).
  - Senha deve atender política forte (D-10): 10+ chars, maiúsc/minúsc/número/especial.
  - MinIO containerizado no `docker-compose.yml`, bucket `avatars` criado no init.
- **Touchpoints:** `CMP-01` (AuthController.signup, PhotoStorageService, UserService.create), `CMP-02` (JwtProvider gera token igual login), `CMP-03` (SignupPage + Uploader component), `CMP-05` (MinIO).
- **Contratos impactados:** `POST /api/auth/signup`, `POST /api/users/me/photo`.
- **Critério de aceite técnico:**
  - Signup sem foto → user criado, foto null, token retornado.
  - Signup com foto válida → arquivo no bucket `avatars`, `photo_url` setado, token retornado.
  - Signup com foto > 2MB → 422 `PHOTO_TOO_LARGE`.
  - Signup com tipo inválido (.gif, .pdf renomeado) → 422 `INVALID_PHOTO_TYPE`.
  - Signup com login duplicado → 409 `LOGIN_ALREADY_EXISTS`.
  - Signup com senha fraca → 422 `WEAK_PASSWORD` com lista de regras violadas.

---

## 11. Implementation plan input

**Cada `WORK-XX` abaixo é o esqueleto de alto nível. Cada WORK vira uma spec própria detalhada (no mesmo template), alocada em `docs/specs/work-XX-*.md`. Specs são produzidas e aprovadas UMA POR VEZ — só depois de Diego aprovar o resultado da implementação anterior, a próxima spec é escrita.**

### Tabela-resumo de progresso

| # | Fase | Dep. | Spec criada | Implementada | Aprovada pelo Diego |
|---|------|------|-------------|--------------|---------------------|
| WORK-01 | Setup & Configuração | — | [x] | [x] | [x] |
| WORK-02 | Entidades JPA | 01 | [x] | [x] | [x] |
| WORK-03 | Security (login + JWT + proteção total) | 02 | [x] | [x] | [x] |
| WORK-04 | CRUDs simples (Category, BankAccount, Investment) | 03 | [x] | [x] | [x] |
| WORK-05 | Salário (regra de competência) | 04 | [x] | [x] | [x] |
| WORK-06 | Despesas + Installments | 04 | [x] | [x] | [x] |
| WORK-07 | Dashboard (agregações) | 05, 06 | [x] | [x] | [x] |
| WORK-08 | Frontend setup + auth + telas amigáveis 401 | 03 | [x] | [x] | [x] |
| WORK-09 | Frontend telas CRUD + dashboard | 07, 08 | [x] | [x] | [x] |
| WORK-09B | Tipo de despesa VARIABLE (pontual) | 09 | [x] | [x] | [x] |
| WORK-09C | Dashboard: VARIABLE + visibilidade INSTALLMENT | 09B | [x] | [x] | [x] |
| WORK-09D | Separar purchase_date de firstDueDate em INSTALLMENT | 09 | [x] | [x] | [x] |
| WORK-09E | Redesign da pizza (donut + total central + animação) | 09 | [x] | [x] | [x] |
| WORK-09F | Color picker nas categorias + cor na pizza | 09E | [x] | [x] | [x] |
| WORK-09G | Controle de pagamento de parcelas (PAID/ANTICIPATED/unpay) | 09F | [x] | [x] | [x] |
| WORK-10 | Docker orquestrado (back + front + postgres) | 09 | [x] | [x] | [x] |
| WORK-11 | Signup público + upload + MinIO | 10 | [x] | [x] | [x] |
| WORK-12 | Hardening (rate limiting + security headers + logs) | 11 | [x] | [x] | [x] |
| WORK-13 | Extras de query (paginação, filtros simples, PATCH /active) — backlog formal | qualquer momento após 04 | [ ] | [ ] | [ ] |
| WORK-14 | Security hardening extra (refresh token + CSRF + CSP + idle timeout + Secure cookie em prod) — backlog formal | qualquer momento após 08; ideal antes de produção | [ ] | [ ] | [ ] |

> **Regra de marcação:** Claude **nunca** marca uma coluna como `[x]` por iniciativa própria. Spec criada → marca após Diego aprovar a spec. Implementada → marca após Diego confirmar smoke-test. Aprovada → marca após Diego dizer "aprovado".

---

### `WORK-01` Setup & Configuração inicial
- **Status:** ✅ Concluída e aprovada pelo Diego em 2026-05-31
- **Objetivo:** ambiente completo configurado, app sobe sem erros, conecta no Postgres, healthcheck responde, `.env` + `.env.example` + `.gitignore` prontos.
- **Pré-requisitos:** projetos Maven já criados (✓), Java 21 (✓).
- **Arquivos alvo:** `docker-compose.yml` (postgres), `application.yml` (financial, com `${VAR}` placeholders), `.env` (gitignored), `.env.example` (versionado), `.gitignore` raiz, estrutura de packages, `HealthController`, `README.md`.
- **Mudanças esperadas:** Postgres em container, app conectando via env vars, `/api/health` respondendo 200, secrets fora do código.
- **Dependências:** nenhuma.
- **Pode ser paralelo:** não (base de todas as outras fases).
- **Como validar:** copiar `.env.example` → `.env`, `docker-compose up -d postgres`, `mvnw spring-boot:run`, `curl localhost:8080/api/health` → 200.

### `WORK-02` Entidades JPA
- **Status:** ✅ Concluída e aprovada pelo Diego em 2026-06-03
- **Objetivo:** 8 tabelas geradas pelo Hibernate na primeira subida, validadas via pgAdmin.
- **Pré-requisitos:** WORK-01 concluído.
- **Arquivos alvo:** `model/User.java`, `BankAccount.java`, `ExpenseCategory.java`, `Salary.java`, `Expense.java`, `Installment.java`, `Investment.java`, `Menu.java`, `model/enums/*`, `model/BaseEntity.java`.
- **Mudanças esperadas:** classes JPA com anotações, base entity com audit (@PrePersist/@PreUpdate), enums (ExpenseType, ExpenseStatus, InstallmentStatus), `ddl-auto=update`.
- **Dependências:** WORK-01.
- **Pode ser paralelo:** não.
- **Como validar:** subir app, conectar no Postgres, listar tabelas e conferir colunas/FKs/constraints contra `01-database-modeling.md`.

### `WORK-03` Security (login + JWT + proteção total)
- **Status:** ✅ Concluída e aprovada pelo Diego em 2026-06-03 (inclui aditivo `/api/users/me`)
- **Objetivo:** login funcional retornando JWT (expira 8h); whitelist explícita só com `/api/auth/login` e `/api/health` públicos (signup vem na WORK-11); todos os outros endpoints retornam 401 sem token, com payload distinguindo `UNAUTHORIZED` de `TOKEN_EXPIRED`.
- **Pré-requisitos:** WORK-02 (precisa da entidade `User`).
- **Arquivos alvo:** na lib `security` — `JwtProvider`, `JwtAuthenticationFilter`, `SecurityConfig` (whitelist), `PasswordEncoderConfig` (BCrypt strength 10), `JwtProperties` (lê `${JWT_SECRET}`, `${JWT_EXPIRATION_HOURS}`); no `financial` — `UserRepository`, `UserDetailsServiceImpl`, `AuthController.login`, `LoginRequest/Response DTO`, `ApiErrorHandler` (`@RestControllerAdvice` traduzindo exceções para payload padronizado).
- **Mudanças esperadas:** dependência `security` no `financial`, endpoint `POST /api/auth/login`, filtro JWT ativo, payload de erro padrão.
- **Dependências:** WORK-02.
- **Pode ser paralelo:** não.
- **Como validar:** seed manual de 1 user com senha BCrypt → POST login com credenciais válidas → 200 + JWT → GET `/api/categories` sem token → 401 `UNAUTHORIZED` → com token válido → 200 (lista vazia) → com token expirado/manipulado → 401 `TOKEN_EXPIRED`.

### `WORK-04` CRUDs simples (Category, BankAccount, Investment)
- **Status:** ✅ Concluída e aprovada pelo Diego em 2026-06-05 (Postman collection pulada por decisão; isolamento multi-user validado em smoke direto via PowerShell + DBeaver)
- **Objetivo:** 3 CRUDs padrão, soft-delete, validação Jakarta, isolamento por user, MapStruct para mapeamento.
- **Pré-requisitos:** WORK-03.
- **Arquivos alvo:** trio Controller/Service/Repository + DTOs + Mapper MapStruct para cada entidade.
- **Mudanças esperadas:** 3 conjuntos paralelos de endpoints REST; `user_id` extraído do `SecurityContext` em todas as queries/inserts.
- **Dependências:** WORK-03.
- **Pode ser paralelo:** sim, dentro da spec (Category, BankAccount, Investment podem ser implementadas em paralelo se houver mais de um dev — neste projeto não se aplica).
- **Como validar:** Postman exercita os 4 verbs em cada recurso, valida soft-delete e isolamento (2 users diferentes não veem dados um do outro).

### `WORK-05` Salário (CRUD com regra de competência)
- **Status:** ✅ Concluída e aprovada pelo Diego em 2026-06-05 (hard delete confirmado; Postman pulada conforme [[project-postman-strategy]])
- **Objetivo:** CRUD de `Salary` com UNIQUE(user, year, month) e validações de competência.
- **Pré-requisitos:** WORK-04 (precisa de BankAccount funcionando).
- **Arquivos alvo:** SalaryController/Service/Repository, SalaryDTO, validações customizadas.
- **Dependências:** WORK-04.
- **Pode ser paralelo:** não.
- **Como validar:** cadastrar 2 salários na mesma competência → 409 `DUPLICATE_SALARY`. Atualizar competência colidindo → 409.

### `WORK-06` Despesas + Installments
- **Status:** ✅ Concluída e aprovada pelo Diego em 2026-06-05 (refatorada pra JPA Specifications no meio do caminho — Postgres não infere tipo de parâmetro NULL em JPQL `:p IS NULL`)
- **Objetivo:** criar/atualizar/cancelar despesas FIXED e INSTALLMENT, com geração automática de parcelas e cancelamento em cascata.
- **Pré-requisitos:** WORK-04 (categoria + bank account).
- **Arquivos alvo:** ExpenseController/Service/Repository, InstallmentService (geração + cascata), ExpenseDTO, validações cruzadas (`installments_count` obrigatório se INSTALLMENT).
- **Mudanças esperadas:** lógica de geração de parcelas espaçadas por mês a partir de `purchase_date`; ação `cancel` que marca expense + parcelas pendentes como CANCELLED (parcelas pagas ficam intactas).
- **Dependências:** WORK-04.
- **Pode ser paralelo:** não.
- **Como validar:** criar INSTALLMENT 10x R$100 com `purchase_date=2026-06-15` → tabela `installments` tem 10 linhas com `due_date` indo de 2026-07-15 até 2027-04-15. Cancelar a expense → 10 parcelas viram CANCELLED.

### `WORK-07` Dashboard (agregações)
- **Status:** ✅ Concluída e aprovada pelo Diego em 2026-06-06 — **fecha todo o backend MVP**. Próximo passo é Postman collection consolidada (conforme [[project-postman-strategy]]) antes da WORK-08 (front).
- **Objetivo:** endpoints de saldo do mês e de despesas por categoria.
- **Pré-requisitos:** WORK-05, WORK-06.
- **Arquivos alvo:** DashboardController/Service, queries JPQL de agregação.
- **Mudanças esperadas:** `GET /api/dashboard/balance?year=&month=` + `GET /api/dashboard/expenses-by-category?year=&month=`.
- **Dependências:** WORK-05 + WORK-06.
- **Pode ser paralelo:** não.
- **Como validar:** popular dados de teste, conferir saldo manualmente vs. resposta da API (fórmula em `01-database-modeling.md` §4).

### `WORK-08` Frontend — setup + autenticação + telas amigáveis 401
- **Status:** ✅ Concluída e aprovada pelo Diego em 2026-06-06 (migrou DURANTE a fase de `localStorage` pra `httpOnly cookie` + CSRF/CORS production-grade. Tema light clean. Hardening adicional formalizado em [[work-14-security-hardening-extra]])
- **Objetivo:** projeto front criado, tela de login funcional, layout protegido com menu lateral (carregado de `/api/menus`), route guards + interceptor de 401, telas amigáveis "Você precisa fazer login" e "Sua sessão expirou".
- **Pré-requisitos:** WORK-03 (login back funcional) — endpoint `/api/menus` será mockado nesta fase se WORK-04 ainda não tiver expostas as rotas.
- **Arquivos alvo:** projeto novo em `D:\workspace\financial-front` (Vite scaffold), config Tailwind, React Router, Axios com interceptor JWT, `LoginPage`, `ProtectedLayout`, `Sidebar`, `UnauthorizedPage`, `SessionExpiredPage`, `RouteGuard` HOC ou componente.
- **Dependências:** WORK-03.
- **Pode ser paralelo:** **sim** com WORK-04..WORK-07 (front depende só do login estar funcional; conforme back avança, front consome).
- **Como validar:** `npm run dev` → `/dashboard` sem token → "Você precisa fazer login" → ir pra login → autentica → menu lateral aparece → forçar token inválido no localStorage → próxima chamada → "Sua sessão expirou".

### `WORK-09` Frontend — telas CRUD + dashboard
- **Status:** ⬜ Pendente
- **Objetivo:** todas as telas funcionais consumindo a API.
- **Pré-requisitos:** WORK-07 (todos endpoints prontos) + WORK-08 (layout).
- **Arquivos alvo:** pages/components React para cada entidade + dashboard com `<PieChart>` (Recharts).
- **Dependências:** WORK-07 + WORK-08.
- **Pode ser paralelo:** parcialmente — telas independentes podem ser feitas em paralelo dentro da spec.
- **Como validar:** smoke test E2E manual de cada fluxo.

### `WORK-10` Docker orquestrado (back + front + postgres)
- **Status:** ⬜ Pendente
- **Objetivo:** `docker-compose up` sobe back + front + postgres comunicando, todos lendo secrets do `.env`.
- **Pré-requisitos:** WORK-09.
- **Arquivos alvo:** `Dockerfile` (financial, multi-stage build com mvnw + lib security copiada), `Dockerfile` (financial-front, build Vite + serve via Nginx), `docker-compose.yml` orquestrando 3 serviços com healthchecks, dependências e `env_file: .env`.
- **Dependências:** WORK-09.
- **Pode ser paralelo:** não.
- **Como validar:** `docker-compose up -d --build` → acessar `http://localhost/` → fluxo completo (sem signup/foto ainda) funciona.

### `WORK-11` Signup público + upload de foto + MinIO
- **Status:** ⬜ Pendente
- **Objetivo:** cadastro público funcional com upload de foto pra MinIO; usuário criado via tela com foto, faz auto-login e vê o avatar no menu.
- **Pré-requisitos:** WORK-10 (todos os serviços base já dockerizados e funcionais).
- **Arquivos alvo:**
  - `docker-compose.yml` (adicionar serviço `minio` com volume + bucket-init sidecar criando bucket `avatars`)
  - Back: `PhotoStorageService` (AWS S3 SDK contra MinIO), `AuthController.signup`, `UserController.uploadPhoto`, validações (tipo, tamanho, magic bytes), `PasswordPolicyValidator` (regex 10+ chars com maiúsc/minúsc/número/especial), DTOs novos.
  - Front: `SignupPage`, `ImageUploader` component, ajuste no `LoginPage` (botão "Cadastre-se"), atualizar `Sidebar`/topbar para exibir avatar.
  - Config: novas env vars no `.env` (`MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_BUCKET`), `application.yml` apontando para `http://minio:9000` em ambiente docker.
- **Mudanças esperadas:** endpoints `/api/auth/signup` e `/api/users/me/photo` (com signup público adicionado à whitelist do SecurityFilterChain), bucket `avatars` criado automaticamente, foto persiste entre reinicializações via volume MinIO.
- **Dependências:** WORK-10.
- **Pode ser paralelo:** não.
- **Como validar:**
  - `docker-compose up -d --build` sobe tudo incluindo minio.
  - Abrir `http://localhost/` → tela login → clicar "Cadastre-se" → preencher form com foto JPG válida → submeter → auto-login → avatar aparece no menu.
  - Signup com senha fraca/foto > 2MB/tipo inválido → mensagens de erro específicas exibidas.
  - Console MinIO (`http://localhost:9001`) mostra arquivo em `avatars/users/{uuid}/avatar.jpg`.

### `WORK-12` Hardening (rate limiting + security headers + logs)
- **Status:** ⬜ Pendente
- **Objetivo:** proteger a API contra bots e abuso de chamadas; reforçar headers de segurança; logar tentativas suspeitas para auditoria mínima.
- **Pré-requisitos:** WORK-11.
- **Arquivos alvo:**
  - Lib `security`: `RateLimitFilter` (Bucket4j ou Resilience4j) — por IP, com limites distintos:
    - `/api/auth/login` e `/api/auth/signup`: **agressivo** (ex: 5 tentativas / 1 min / IP).
    - Demais endpoints autenticados: **permissivo** (ex: 100 reqs / 1 min / IP).
  - Lib `security`: ajustar `SecurityConfig` para adicionar headers de segurança extras (HSTS, Referrer-Policy, Permissions-Policy, CSP básica).
  - Lib `security`: `SuspiciousActivityLogger` — loga em WARN quando: rate limit é atingido, login falha 3+ vezes seguidas do mesmo IP, JWT inválido é apresentado, signup com login duplicado tenta múltiplas vezes.
  - `application.yml`: nova section `security.rate-limit.*` (limites configuráveis via env).
- **Mudanças esperadas:** 100 reqs/seg do mesmo IP → algumas retornam 429 `TOO_MANY_REQUESTS`. Log estruturado de eventos suspeitos. Headers de segurança visíveis no DevTools.
- **Dependências:** WORK-11.
- **Pode ser paralelo:** não.
- **Como validar:**
  - Script bash/PowerShell que dispara 10 POSTs ao `/api/auth/login` em 1s → as 5 últimas devem retornar 429.
  - Inspecionar response headers no DevTools — HSTS, X-Frame-Options, Referrer-Policy presentes.
  - `docker logs financial` mostra WARN em tentativas suspeitas.

### `WORK-13` Extras de query (paginação, filtros simples, PATCH /active)
- **Status:** ⬜ Backlog formalizado em 2026-06-05 (origem: Open Items O-12/O-13/O-14 da spec WORK-04, removidos do escopo daquela fase)
- **Objetivo:** registrar formalmente como pendência conhecida três extras de query/UX nos CRUDs simples (`/api/categories`, `/api/bank-accounts`, `/api/investments`) que não entraram na WORK-04 e não são cobertos por nenhuma outra fase. Implementar **só sob demanda**, quando o front ou o uso real do sistema mostrar necessidade.
- **Pré-requisitos:** WORK-04 implementada (pré-existência dos CRUDs).
- **Escopo:**
  - **Paginação** (O-12): `?page=&size=` com `Pageable` do Spring Data, response como `Page<{X}Response>`.
  - **Filtros simples** (O-13): busca por nome (`?q=`) e/ou flag `?activeOnly=`. Implementação via `Specifications` ou métodos derivados.
  - **PATCH `/active`** (O-14): `PATCH /api/{recurso}/{id}/active` com body `{ "active": true/false }` para reativar item soft-deletado. Só ganha sentido se houver tela de admin (que hoje não está planejada — então essa parte espera demanda real do front).
- **Dependências:** WORK-04. Sem depender de WORK-05+.
- **Pode ser paralelo:** sim — pode ser puxada em qualquer momento após WORK-04, sem bloquear o roadmap principal.
- **Como validar:** spec própria será escrita quando a fase for puxada; smoke tests com Postman cobrindo cada cenário.

### `WORK-14` Security hardening extra (cookie auth produção + XSS + CSRF + idle timeout)
- **Status:** ⬜ Backlog formalizado em 2026-06-06 (origem: revisão de segurança ao fechar a WORK-08; lista de "o que ainda é risco" e "boas práticas adicionais" levantada por Diego).
- **Objetivo:** levar a autenticação cookie-based da WORK-08 para production-grade em ambiente real (HTTPS, domínios distintos, refresh token rotation, CSP, idle timeout). Reduzir superfície de ataque XSS no front e mitigar cenário de acesso físico.
- **Pré-requisitos:** WORK-08 entregue (cookie auth). Ideal pós-WORK-12 (rate limit + headers básicos) para evitar duplicação.
- **Escopo:**
  - **Refresh token rotation**: access token 15min + refresh 8h-30d em cookie httpOnly separado, com tabela `refresh_tokens` (hash BCrypt, revogação). Endpoint `POST /api/auth/refresh`.
  - **Cookie hardening em prod**: `Secure` + `SameSite=None` (ou `Strict`) configuráveis via env vars; perfil Spring `prod` vs `dev`.
  - **CSRF token explícito**: `CookieCsrfTokenRepository.withHttpOnlyFalse()` + Axios envia `X-XSRF-TOKEN` automático.
  - **CSP headers** restritivos (`default-src 'self'`, `script-src 'self'`, etc) — começa em `report-only`, promove a `enforcing` após validação.
  - **Idle auto-logout** no front: hook `useIdleLogout` com modal "vai expirar em 1min".
  - **Auditoria XSS**: zero `dangerouslySetInnerHTML` no codebase; tudo user-controlled passa por JSX `{value}`.
  - **(Opcional)** Endpoints de gestão de sessões (lista/revoga) com tela própria.
- **Dependências:** WORK-08. Recomendado após WORK-12.
- **Pode ser paralelo:** sim — pode ser puxada em qualquer momento após WORK-08, sem bloquear roadmap principal. Mas **deve ser entregue antes de produção real**.
- **Como validar:** spec detalhada em `docs/specs/work-14-security-hardening-extra.md`. Smoke E2E: login → /me 15min depois → 401 TOKEN_EXPIRED → /refresh transparente → /me OK; logout revoga refresh token no banco; CSRF token bloqueia POST cross-origin sem header; idle timeout dispara logout após N minutos.

---

## 12. Test plan

- **Testes unitários:** JUnit 5 + Mockito + AssertJ. Cobertura mínima esperada nos `Service`s (regras de negócio). Não testar getters/setters nem mappers triviais.
- **Testes de widget ou UI:** N/A no escopo deste plano (front não tem testes automatizados nesta versão — pode ser adicionado em fase futura).
- **Testes de integração:** Spring Boot Test + Testcontainers (Postgres real). Cobrir fluxos completos: login, criação de despesa parcelada com geração de installments, cancelamento, dashboard.
- **Testes de contrato:** N/A (sem consumidores externos).
- **Testes manuais:** Postman/Insomnia collection para cada controller. Smoke test manual antes de cada release.
- **Regressões obrigatórias:** ao final de cada WORK, rodar a suite completa de testes anteriores antes de mergear na main.

---

## 13. Open items

**Bloqueios:** nenhum no momento.

**Riscos:**
| Risco | Mitigação |
|---|---|
| Spring Boot 4.x é recente; possíveis bugs ou docs escassos | Manter dependências atualizadas; se um bug crítico surgir, fallback para Boot 3.5.14. |
| `ddl-auto=update` pode falhar em mudanças complexas (rename de coluna, mudança de tipo) | Documentar limitação; em caso de divergência, dropar tabela manualmente e recriar (aceitável por se tratar de dados de teste). |

**Decisões fechadas (resolvidas em 2026-05-31):**
| # | Decisão | Resolução |
|---|---------|-----------|
| D-01 | Menus | **Em banco com `active`**, seed via `data.sql`, sem CRUD admin. Diego ativa/desativa via SQL direto. Endpoint `GET /api/menus` retorna apenas ativos. |
| D-02 | "Adiantar parcela" | **Spec separada pós WORK-06.** Estrutura de dados já suporta com `status=ANTICIPATED`. |
| D-03 | Multi-user | **Sim, `user_id` em todas as tabelas de domínio** (exceto `menus` que é global). |
| D-04 | Foto do usuário + signup | **Upload real para MinIO + signup público.** Login E signup são públicos; todo o resto exige JWT. |
| D-NEW | Storage S3-like | **MinIO** containerizado. AWS S3 SDK no back. Bucket `avatars`. |
| D-05 | `Investment.quantity` | **INTEGER**. |
| D-06 | Mapper Entity↔DTO | **MapStruct** (annotation processor, zero boilerplate). |
| D-07 | BCrypt strength | **10** (default Spring). |
| D-08 | Expiração JWT | **8 horas**. |
| D-09 | Fase signup+upload | **WORK-11 dedicada** após WORK-10. |
| D-10 | Política de senha | **10+ chars, maiúsc/minúsc/número/especial.** Validada client + server, server é fonte de verdade. |
| D-11 | Limites de upload | **JPG/PNG, máx 2MB.** Validar MIME, tamanho e magic bytes. |
| D-12 | Proteção total das telas | **Públicos:** `POST /api/auth/login`, `POST /api/auth/signup`, `GET /api/health`. Tudo o mais exige JWT. Front com route guards + interceptor 401, telas amigáveis ("Você precisa fazer login" / "Sua sessão expirou"). |
| D-13 | Rate limiting | **WORK-12 dedicada** após WORK-11. Limites distintos para auth (agressivo) vs demais (permissivo). |
| D-14 | Secrets | **`.env` na raiz (gitignored) + `.env.example` versionado.** `docker-compose` usa `env_file: .env`. Spring resolve `${VAR}` no `application.yml`. |
| D-15 | Estratégia de specs | **Uma por vez.** Após implementação, Claude **sempre** pergunta se Diego aprova antes de marcar `[x]` no plano. |

**Assunções temporárias:**
- Diego é o único usuário do sistema durante o desenvolvimento (single-user na prática, mas modelado como multi).
- Ambiente de execução: Windows local (Diego) + docker-compose; cloud não está no roadmap.
- Sem git/CI/CD nesta versão (pode entrar em fase futura).

---

**Próximo passo:** após aprovação final deste plano-mãe pelo Diego:
1. Criar `docs/specs/work-01-setup.md` (spec detalhada da WORK-01) seguindo o template SDD.
2. Diego revisa e aprova a spec.
3. Claude implementa.
4. Claude apresenta resultado e **pergunta explicitamente se Diego aprova** (D-15).
5. Após aprovação verbal: Claude marca `[x]` nas três colunas da tabela-resumo (spec/implementada/aprovada).
6. Claude inicia spec da WORK-02 — e assim sucessivamente.

**Nunca pular o passo 4.** A aprovação verbal/escrita do Diego é o único gatilho para marcar `[x]`.
