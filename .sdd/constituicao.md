# Constituição — Financial

> Regras inegociáveis deste projeto. Os revisores do sdd-diego cobram cada item e citam o id. Mudanças aqui só com o "aprovo" do Diego.

## O sistema

- **Objetivo:** controle financeiro pessoal (salários por competência, despesas, investimentos, PJ, Gmail e chat RAG); projeto educacional para praticar Spec Driven Development.
- **Quem usa:** Diego (multiusuário pronto, com signup público).
- **Stack:** Java 21 + Spring Boot 4.0.6 (lib `security` separada), React 19 + Vite + TS + Tailwind, PostgreSQL 16 (pgvector), Redis, MinIO, Docker Compose.
- **Branch principal:** master

## Regras deste projeto (sobrescrevem os perfis)

- **PJ-01** Spring Boot `4.0.6` (nunca `4.0.6.RELEASE`), Java 21 LTS; build sempre pelo `mvnw`, sem Maven global.
- **PJ-02** Sem migrations (Flyway/Liquibase): schema gerado pelo Hibernate com `ddl-auto=update`; nunca `create` nem `create-drop`.
- **PJ-03** Menus: só `GET /api/menus`. Sem endpoints de CRUD; insert/update via SQL direto (`data.sql`).
- **PJ-04** A lib `security` não importa nada do `financial`, não tem `main` nem `spring-boot-maven-plugin`; secret JWT só por configuração externa.
- **PJ-05** Signup: senha com 10+ caracteres, maiúscula, minúscula, número e especial; foto JPG/PNG até 2MB (MinIO). BCrypt strength 10, JWT de 8h.
- **PJ-06** Não editar `04-development-spec-system-design-template.md` (modelo-mestre de spec).

## Perfis incluídos

# Perfil: processo (sempre incluído)

Regras de processo do Diego. Os revisores citam o id da regra (ex.: `PR-04`) ao apontar desvio.

## Fluxo e aprovações

- **PR-01** Toda mudança passa por uma WORK: feature e fix com plano → spec → código; mudanças pequenas pelo fluxo de ajuste.
- **PR-02** Só o Diego aprova portões (plano, spec, commit, finalizar), escrevendo no início da mensagem. Ninguém declara aprovação em nome dele.
- **PR-03** Nada de código antes da spec aprovada. A spec alterada depois de aprovada precisa ser validada e aprovada de novo.
- **PR-04** Nada de commit antes do teste manual do Diego e do "pode commitar". Nada de merge ou push antes do "pode finalizar".
- **PR-05** Mudança de ideia do Diego vira decisão nova (`D-x`) na spec, sem apagar o histórico.

## Specs e documentação

- **PR-06** Specs sempre no modelo `04-development-spec-system-design-template.md` (Variant A), com todas as seções na ordem; seção que não se aplica fica "n/a — motivo".
- **PR-07** Requisitos com critérios Dado / Quando / Então com valores reais.
- **PR-08** Cada WORK tem pasta `docs/specs/WORK-XX-assunto/` com plano, spec, tarefas, validações e evidências.
- **PR-09** A coleção de API (ex.: Postman) é atualizada a cada endpoint novo ou alterado.

## Git

- **PR-10** Branch por WORK a partir da principal: `feature/work-XX-assunto` ou `fix/work-XX-assunto`.
- **PR-11** Commits separados por área (backend, frontend, docs), mensagem `feat|fix|docs(WORK-XX): …` e linha de coautoria.
- **PR-12** Merge `--no-ff` na principal; nunca `push --force`, `reset --hard` ou apagar a principal.
- **PR-13** Nunca versionar dado pessoal (planilhas, extratos), `.env`, chaves ou senhas.

## Testes

- **PR-14** Teste antes do código (TDD). Todo teste precisa poder falhar se a regra quebrar.
- **PR-15** Proibido teste banal: asserção trivial, só getter/setter, só "não lançou exceção", mock da regra testada.
- **PR-16** Teste manual com dados reais antes do commit; usuário de teste para API e tela, apagado no fim.

# Perfil: java-spring

Padrão de backend do Diego, tirado do projeto `financial` (Java 21 + Spring Boot 4). Os revisores citam o id (ex.: `JS-07`).

## Arquitetura

- **JS-01** Pacotes por camada: `controller · service · repository · model (+ enums) · dto · mapper · exception · config · integration`.
- **JS-02** Controller "burro": recebe DTO, chama o service, devolve DTO. **Toda regra de negócio fica no service.**
- **JS-03** Entity nunca sai do service. DTOs de entrada e saída são `record`; conversão com **MapStruct**. Lombok nas entidades.
- **JS-04** Integração externa (ex.: cotações) isolada em `integration/`, com cache (Redis) e falha tratada sem derrubar a tela.
- **JS-05** Funcionalidade nova arriscada nasce atrás de flag (`@ConditionalOnProperty`).
- **JS-06** Em sistema modular (ERP): um módulo nunca lê tabela de outro; conversa pela interface pública do outro módulo; teste de arquitetura (Spring Modulith ou ArchUnit) garante.

## Dados

- **JS-07** Toda tabela de domínio tem `user_id`; o `user_id` vem **sempre** do contexto de segurança, **nunca** do payload, e toda consulta filtra por ele.
- **JS-08** Soft-delete: nada de DELETE físico de dado de negócio (`active=false` ou status).
- **JS-09** Entidade base com `id` UUID, `created_date` e `updated_date` em `TIMESTAMP WITH TIME ZONE`.
- **JS-10** Dinheiro em `NUMERIC(12,2)` e `BigDecimal`, arredondamento `HALF_UP` com escala 2; nunca `double`.
- **JS-11** Datas de negócio em `America/Sao_Paulo`; comparação de dia usa `LocalDate` na zona, não UTC.
- **JS-12** Schema: `ddl-auto=update` no `financial`; **Flyway** em projetos novos (ERP), um schema por módulo.

## API e erros

- **JS-13** Validação na entrada com `@Valid` + anotações Jakarta no DTO, mensagens em português.
- **JS-14** Regra de negócio violada → exceção própria; um `@RestControllerAdvice` traduz para o payload padrão `{timestamp, status, code, message, fieldErrors}`.
- **JS-15** Erro previsível nunca vira 500: 400 (entrada), 404 (não encontrado ou de outro usuário), 409 (conflito), 422 (regra), 503 (dependência fora).
- **JS-16** Autenticação: JWT em cookie `HttpOnly` + proteção CSRF (lib `security`), senha com BCrypt.

## Código e testes

- **JS-17** Sem comentário óbvio; comentário só para o "porquê" de algo não óbvio. Nomes dizem o que a coisa faz.
- **JS-18** Build com `./mvnw`; testes com JUnit 5 + Mockito + AssertJ; `isEqualByComparingTo` para `BigDecimal`.
- **JS-19** Teste de service com repositório mockado e `SecurityContext` preenchido com o usuário de teste; isolamento entre usuários testado.

# Perfil: react-ts

Padrão de frontend do Diego, tirado do `financial-front` (React + Vite + TypeScript + Tailwind). Os revisores citam o id (ex.: `RT-05`).

## Estrutura

- **RT-01** Pastas: `pages · components/ui · services · types · hooks · contexts · guards · utils`.
- **RT-02** Um **service por recurso** sobre um cliente `axios` único; os tipos em `types/` espelham os DTOs do backend.
- **RT-03** Em sistema modular (ERP): uma pasta por módulo (`src/modules/<modulo>/`), carregada sob demanda.

## Componentes e estado

- **RT-04** Reutilize os componentes de UI do projeto (`Button`, `Input`, `Select`, `CurrencyInput`, `Modal`, `ConfirmModal`, `Table`, `KpiCard`, `SectionTitle`, `PageHeader`) antes de criar outro.
- **RT-05** Modal montado só quando abre; sem `setState` síncrono dentro de `useEffect` (regra do lint `react-hooks/set-state-in-effect`).
- **RT-06** Erro da API mostrado com `extractApiError` + toast; nunca engolido.
- **RT-07** Dinheiro e data formatados pelos utilitários únicos (`formatCurrency`, `formatDate`); sem formatação ad hoc.
- **RT-08** Rotas protegidas por guard; logout por inatividade.

## Visual

- **RT-09** Tailwind com os tons de cada área (tom da página, cores de status); consistência entre telas.
- **RT-10** Valores sensíveis respeitam o "olhinho" (esconder valores).
- **RT-11** Animações respeitam "reduzir movimento" (`motion-safe`).
- **RT-12** Gráficos com Recharts, rótulos e tooltips formatados em pt-BR.

## Qualidade

- **RT-13** `tsc` sem erro; ESLint sem erro **novo** (o projeto pode ter erros antigos conhecidos, controlados por `limiteErros`).
- **RT-14** Texto de interface em português, do ponto de vista do usuário.
