# WORK-17 — Módulo PJ (Notas Fiscais e Encargos Fiscais)

## Metadados

- `spec_id`: WORK-17
- `titulo_tecnico`: Módulo PJ — Cadastro de Notas Fiscais e Encargos Fiscais mensais
- `source_product_spec`: Conversa Diego ↔ Claude em 2026-07-30/31 (memória em `project-pending-pj-module`)
- `source_product_spec_version`: 1
- `baseline_branch_or_commit`: `master @ 4667915`
- `target_branch`: `work-17-pj-module` (a criar)
- `escopo_sistema`: financial (backend Spring Boot) + financial-front (React) + MinIO
- `última_atualização`: 2026-07-31

## 1. Objective do documento

- O que esta spec técnica precisa permitir que engenharia faça:
  - Implementar cadastro/edição/exclusão/listagem de lançamentos PJ (1 Nota Fiscal + 3 encargos fiscais mensais: DAS, INSS, Contabilidade)
  - Upload e download seguro de arquivos anexos (PDF/JPG/PNG até 5MB) em bucket MinIO privado
  - Nova tela `/pj` acessível via novo item de menu populado pelo `data.sql`
  - Dashboard reformulado: 4º KPI "Impostos PJ" sempre visível, fatia dedicada no gráfico de pizza (cor `#4fdd85`) quando houver lançamentos no mês, saldo recalculado descontando impostos
- O que esta spec **não** cobre:
  - Suporte a múltiplos clientes/empresas (Diego confirmou: 1 único cliente)
  - Múltiplos encargos do mesmo tipo por mês (apenas 1 de cada tipo por mês)
  - Cálculo automático de DAS/INSS a partir do valor da NF
  - Alertas ou notificações de vencimento
  - Integração com API externa de emissão/consulta de NF
  - Provisão para 13º / férias / IR anual
- Artefatos complementares: nenhum diagrama externo (spec autocontida)

## 2. System overview

- **Estado atual resumido**:
  - Sistema financeiro pessoal em produção (WORK-01 a WORK-16 + ajustes de UX de 2026-07-30 mergeados em `master`)
  - 3 tipos de despesa (FIXED/INSTALLMENT/VARIABLE) na entidade `Expense`
  - MinIO configurado com bucket **público** `financial-photos` (usado apenas para fotos de perfil)
  - Dashboard exibe 3 KPIs: Salário / Total Despesas / Saldo, mais pizza por categoria e card de portfólio
  - Menu do sistema é lido de tabela `menus` (populada via `data.sql`)
- **Estado alvo resumido**:
  - Nova entidade `PjEntry` isolada, sem impacto nas entidades existentes
  - Novo bucket **privado** `financial-pj-files` para armazenar NF e comprovantes
  - Nova tela `/pj` acessível via menu com ícone `briefcase`
  - Dashboard com 4 KPIs (adiciona "Impostos PJ" sempre visível)
  - Pizza com fatia dedicada "Impostos PJ" (cor `#4fdd85`) quando o mês selecionado tiver ao menos 1 lançamento PJ; clique abre modal listando os encargos
  - Cálculo de saldo passa a ser: `salário − despesas − impostosPJ`
- **Delta técnico**:
  - Backend: 1 entidade JPA nova + 1 tabela nova + 1 controller + 1 service + 1 file-storage service + 1 mapper + 2 DTOs + ajustes no `DashboardService` e `DashboardRepository`
  - Infra: novo bucket privado no MinIO, criado pelo `minio-init`
  - Frontend: 1 página nova, 2 modais novos (form + drill-down), 1 service novo, 1 arquivo de types novo, ajustes em `DashboardPage.tsx` e no cálculo do saldo
- **Escopo explícito**:
  - CRUD completo (criar/editar/excluir/listar/baixar arquivo)
  - Regra UNIQUE: 1 lançamento por `(user_id, year, month, type)`
  - Upload/download autenticado
  - Integração com dashboard (KPI + pizza + saldo)
- **Fora de escopo**:
  - Feature flag (a feature é sempre ativa; se Diego não usar, os lançamentos ficam vazios e o KPI mostra R$ 0,00)
  - Categorização de encargos além dos 4 tipos hardcoded
  - Anexos múltiplos por lançamento
- **Restrições obrigatórias**:
  - Manter padrão multi-user (`user_id` em toda linha; filtragem por `CurrentUser.id()` no service)
  - Reusar padrões existentes: `@Transactional`, `@ConditionalOnProperty` não aplicável aqui, CSRF/JWT do Spring Security config atual, error handling do `ApiErrorHandler`
  - Não quebrar dashboard atual: se nenhum lançamento PJ existe, KPI mostra R$ 0,00 e pizza não tem fatia extra

## 3. Architecture design

- **Arquitetura atual relevante**:
  - Backend Spring Boot 4.0.6, camadas: `controller` → `service` → `repository`
  - Persistência JPA/Hibernate com `ddl-auto=update`
  - Storage: `PhotoStorageService` já existente usa `S3Client` (AWS SDK v2) injetado por bean, escreve em bucket público
  - Frontend React+Vite+TS, autenticação via cookies HTTP-only + CSRF token via cookie visível
- **Arquitetura alvo**:
  - Nova camada de domínio `PjEntry` totalmente isolada; nenhuma FK ou relação bidirecional com `Expense`, `Category`, `BankAccount`, etc.
  - Novo `PjFileStorageService` (não estender `PhotoStorageService` — semanticamente distinto: bucket diferente, formatos diferentes, controle de acesso diferente)
  - Endpoint de download com **stream direto do MinIO para o cliente**, sem exposição de URL pública nem geração de presigned URL — o backend faz `getObject` e escreve o corpo da resposta
- **Principais componentes e relações**:
  ```
  ┌─────────────────────┐        ┌─────────────────────────┐
  │ PjEntryController   │──────► │ PjEntryService          │
  │ (/api/pj-entries)   │        │ (regras + validações)   │
  └─────────────────────┘        └──────┬──────────────┬───┘
                                        │              │
                                        ▼              ▼
                              ┌──────────────────┐ ┌───────────────────────┐
                              │ PjEntryRepository│ │ PjFileStorageService  │
                              │ (JPA)            │ │ (S3Client → MinIO)    │
                              └──────────────────┘ └───────────────────────┘

  DashboardService (existente) ── ganha método sumPjEntriesByType
                              └── integra no BalanceResponse (novo campo pjTaxes)
                              └── integra no expensesByCategory (entry sintético "Impostos PJ")
  ```
- **Diagramas obrigatórios**: nenhum além do textual acima
- **Trade-offs assumidos**:
  - **Uma única entidade** (`PjEntry`) vs duas (`PjInvoice` + `PjCharge`) → escolhida pela simplicidade; casa com o UX descrito ("combo box com tipo do upload"). Custo: NF e encargos ficam misturados na mesma tabela mesmo sendo conceitualmente distintos; queries de agregação precisam de `WHERE type != 'INVOICE'` para excluir NF do total de impostos
  - **Bucket privado + endpoint autenticado** vs bucket público + URLs presigned → escolhido o privado. Custo: backend faz mais trabalho (stream do arquivo). Benefício: nenhum vazamento possível, alinhado com o feedback `security-browser` do Diego (minimização agressiva do que persiste no client / se expõe publicamente)
  - **Edição completa** (valor + arquivo) vs imutável → escolhida a edição completa (Decisão 4). Custo: menos "postura de documento fiscal". Benefício: UX mais tolerante a erros de digitação
  - **Cor hardcoded** (`#4fdd85`) para a fatia "Impostos PJ" → hardcoded. Custo: se um dia surgir outra categoria sintética conflitará. Benefício: simplicidade, sem novo campo no domínio de "categorias sintéticas"

## 4. Data design

- **Entidades impactadas**:
  - **Nova**: `PjEntry`
  - **Sem alteração**: `User`, `Expense`, `Salary`, `Category`, `BankAccount`
- **Campos novos ou alterados**:
  - Nova tabela `pj_entries`:

    | Coluna | Tipo | Nullable | Constraints |
    |---|---|---|---|
    | `id` | uuid | NOT NULL | PK, default `gen_random_uuid()` |
    | `user_id` | uuid | NOT NULL | FK → `users(id)` |
    | `type` | varchar(20) | NOT NULL | enum: `INVOICE`, `DAS`, `INSS`, `ACCOUNTING` |
    | `year` | int | NOT NULL | `>= 2000 AND <= 2100` |
    | `month` | int | NOT NULL | `BETWEEN 1 AND 12` |
    | `amount` | numeric(12,2) | NOT NULL | `> 0.00` |
    | `file_url` | varchar(500) | NOT NULL | key no bucket, ex: `users/{userId}/{uuid}.pdf` |
    | `file_name` | varchar(255) | NOT NULL | nome original enviado |
    | `content_type` | varchar(80) | NOT NULL | `application/pdf` \| `image/jpeg` \| `image/png` |
    | `created_date` | timestamptz | NOT NULL | auto via `@CreatedDate` |
    | `updated_date` | timestamptz | NOT NULL | auto via `@LastModifiedDate` |

  - Constraints:
    - `UNIQUE (user_id, year, month, type)` — 1 lançamento de cada tipo por mês por usuário
- **Regras de validação**:
  - Backend (Bean Validation + service):
    - `type` ∈ enum obrigatório
    - `year` entre 2000 e 2100
    - `month` entre 1 e 12
    - `amount > 0` (todos os tipos, inclusive `INVOICE` — Decisão 3)
    - `file`: tamanho máximo 5MB, content-type em [`application/pdf`, `image/jpeg`, `image/png`]
    - Verificação de duplicidade antes de persistir (409 CONFLICT se já existe entry com mesmo `type`+`year`+`month` para o user)
- **Persistência**: JPA/Hibernate com `ddl-auto=update`; a tabela é criada na primeira subida do backend após o deploy
- **Cache**: nenhum (volume esperado é baixíssimo — no máximo 4 entries × 12 meses × N anos por usuário)
- **Compatibilidade retroativa**: nenhuma quebra — entidade nova, sem migração
- **Migração de dados**: nenhuma
- **Estratégia de leitura e escrita**:
  - Leitura: sempre filtrada por `user_id` no repository (mesmo padrão de `Expense`)
  - Escrita: `@Transactional` no controller; o upload do arquivo ocorre **antes** de persistir a entidade; se a persistência falhar (constraint violation, etc.), o arquivo é apagado do MinIO em `catch` para evitar órfão

## 5. Interface design

- **Interfaces internas**:
  - `PjEntryService.create(request, file)` → `PjEntryResponse`
  - `PjEntryService.update(id, request, file?)` → `PjEntryResponse` (se `file` for enviado, substitui e apaga o antigo)
  - `PjEntryService.delete(id)` → void (apaga entidade + arquivo do MinIO)
  - `PjEntryService.list(year?, month?)` → `List<PjEntryResponse>`
  - `PjEntryService.get(id)` → `PjEntryResponse`
  - `PjFileStorageService.upload(userId, file)` → String (key)
  - `PjFileStorageService.download(key)` → `InputStream + contentType`
  - `PjFileStorageService.delete(key)` → void
- **APIs externas (REST)**:

  | Método | Path | Content-Type | Descrição |
  |---|---|---|---|
  | `GET` | `/api/pj-entries?year=YYYY&month=MM` | — | Lista lançamentos do mês do user atual (params opcionais — sem params retorna todos os do user) |
  | `POST` | `/api/pj-entries` | `multipart/form-data` | Cria lançamento. Parts: `type`, `year`, `month`, `amount`, `file` |
  | `PUT` | `/api/pj-entries/{id}` | `multipart/form-data` | Edita. `file` é opcional (se enviado, substitui) |
  | `DELETE` | `/api/pj-entries/{id}` | — | Remove entidade + arquivo |
  | `GET` | `/api/pj-entries/{id}/download` | — | Stream do arquivo. Content-Disposition: attachment com o `file_name` |

- **Eventos assíncronos**: nenhum
- **Formato dos payloads**:

  Response (`PjEntryResponse`):
  ```json
  {
    "id": "uuid",
    "type": "DAS",
    "year": 2026,
    "month": 7,
    "amount": 250.00,
    "fileName": "das-julho-2026.pdf",
    "contentType": "application/pdf",
    "createdDate": "2026-07-31T18:00:00Z",
    "updatedDate": "2026-07-31T18:00:00Z"
  }
  ```
  (não expõe `file_url` — o cliente usa `/{id}/download` para baixar)

- **Erros e códigos esperados**:
  - `400 INVALID_PAYLOAD` — validação de campos (year fora de range, amount ≤ 0, etc.)
  - `400 INVALID_FILE` — content-type não suportado ou tamanho > 5MB
  - `404 NOT_FOUND` — id não pertence ao user ou não existe
  - `409 CONFLICT` (código `PJ_ENTRY_DUPLICATE`) — já existe entry com mesmo `type` + `year` + `month`
  - `401 UNAUTHENTICATED` — sem JWT válido
  - `403` — CSRF token inválido em POST/PUT/DELETE
- **Autenticação ou autorização**:
  - Todos os endpoints exigem JWT (padrão `authenticated()` da `SecurityConfig`)
  - Ownership é validado no service via `findByIdAndUserId(id, CurrentUser.id())` — impossível acessar entry de outro user
  - CSRF ativo em POST/PUT/DELETE (não excluído em `CSRF_EXCLUDED`)
- **Idempotência, retry, timeout e fallback**:
  - POST não é idempotente por design (mas UNIQUE constraint impede duplicata acidental → 409)
  - PUT é idempotente
  - DELETE é idempotente (404 após primeira execução)
  - Timeout do multipart segue a config existente do Spring (`max-file-size: 2MB` → **precisa subir para 5MB**; `max-request-size: 3MB` → **precisa subir para 6MB**)
  - Sem retry automático no backend

## 6. Component design

### `CMP-01` PjEntry (JPA entity)

- Responsabilidade: entidade persistente representando um lançamento PJ (NF ou encargo)
- Inputs: N/A (é dado)
- Outputs: N/A
- Estado interno: campos da §4
- Dependências: `PjEntryType` enum
- Regras principais:
  - Builder pattern (mesmo padrão de `Expense`)
  - `@EntityListeners(AuditingEntityListener.class)` para `@CreatedDate`/`@LastModifiedDate`
  - `@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "year", "month", "type"}))`
- Arquivos previstos:
  - `src/main/java/com/financial/model/PjEntry.java`
  - `src/main/java/com/financial/model/enums/PjEntryType.java`

### `CMP-02` PjEntryRepository

- Responsabilidade: acesso a dados
- Métodos:
  - `List<PjEntry> findByUserIdAndYearAndMonth(UUID userId, Integer year, Integer month)`
  - `List<PjEntry> findByUserId(UUID userId)` (usado quando ano/mês são nulos no controller)
  - `boolean existsByUserIdAndYearAndMonthAndType(UUID userId, Integer year, Integer month, PjEntryType type)`
  - `Optional<PjEntry> findByIdAndUserId(UUID id, UUID userId)`
  - `List<PjEntry> findByUserIdAndYearAndMonthAndTypeIn(UUID userId, Integer year, Integer month, Collection<PjEntryType> types)` (usado no dashboard para somar impostos = DAS+INSS+ACCOUNTING)
- Arquivos previstos: `src/main/java/com/financial/repository/PjEntryRepository.java`

### `CMP-03` PjEntryService

- Responsabilidade: regras de negócio
- Métodos:
  - `create(PjEntryRequest, MultipartFile file)`: valida arquivo → checa duplicidade → faz upload → persiste → retorna response
  - `update(UUID id, PjEntryRequest, MultipartFile file?)`: busca entity → valida duplicidade se `type`/`year`/`month` mudaram → se file veio, deleta o antigo e faz upload novo → aplica novos valores → persiste → retorna response
  - `delete(UUID id)`: busca entity → deleta arquivo → deleta entity
  - `list(Integer year, Integer month)`: filtra por user atual + year+month se ambos providos, senão só por user
  - `get(UUID id)`: findByIdAndUserId + `ResourceNotFoundException` se ausente
  - `validateFile(MultipartFile)`: checa contentType e size, joga `InvalidFileException` (nova) se falhar
- Regras principais:
  - `@Transactional` em toda a classe
  - Upload de arquivo acontece **antes** do save; se save falhar (constraint 409), o arquivo é apagado no `catch` para evitar órfão
  - Update com `file` novo: upload do novo primeiro, se falhar rollback sem tocar no antigo; se der certo, entidade atualiza e antigo é apagado no `finally` do sucesso
- Dependências: `PjEntryRepository`, `PjFileStorageService`, `PjEntryMapper`
- Casos de falha:
  - Duplicidade: `ResourceConflictException` (já existe no projeto) com mensagem específica
  - Arquivo inválido: `InvalidFileException` (nova) mapeada para 400 `INVALID_FILE`
- Arquivos previstos: `src/main/java/com/financial/service/PjEntryService.java`

### `CMP-04` PjEntryController

- Responsabilidade: expor REST endpoints
- Path base: `/api/pj-entries`
- Métodos batendo com §5
- Regras principais:
  - `@RequestMapping("/api/pj-entries")`
  - POST/PUT com `consumes = MediaType.MULTIPART_FORM_DATA_VALUE`
  - GET download usa `HttpServletResponse` diretamente para stream + set headers (Content-Type, Content-Disposition, Content-Length)
- Dependências: `PjEntryService`, `PjFileStorageService`
- Arquivos previstos: `src/main/java/com/financial/controller/PjEntryController.java`

### `CMP-05` PjFileStorageService

- Responsabilidade: I/O de arquivos no MinIO (bucket privado)
- Métodos:
  - `String upload(UUID userId, MultipartFile file)`: key = `users/{userId}/{uuid}.{ext}`, retorna key
  - `S3Object download(String key)`: retorna wrapper com `InputStream` + `contentType` + `contentLength`
  - `void delete(String key)`: apaga do bucket
- Config:
  - `@Value("${minio.pj-bucket}")` → `financial-pj-files`
  - Reusa o bean `S3Client` já configurado
- Dependências: `S3Client`
- Arquivos previstos: `src/main/java/com/financial/service/PjFileStorageService.java`

### `CMP-06` DashboardService (modificação)

- Alterações:
  - Novo método `sumPjEntriesByType(UUID userId, int year, int month)` → chama nova query no `DashboardRepository`
  - Método `balance(year, month)`: além dos cálculos atuais, calcula `pjTaxes = DAS+INSS+ACCOUNTING` e inclui no `BalanceResponse` como campo novo `pjTaxes` (BigDecimal). `totalExpenses` continua sendo só despesas (não altera semântica existente).
  - Método `expensesByCategory(year, month)`: se `pjTaxes > 0`, adiciona ao final da lista um `CategoryExpenseResponse` **sintético**: `categoryId = null`, `categoryName = "Impostos PJ"`, `color = "#4fdd85"`, `total = pjTaxes`. O frontend detecta o `categoryId=null` para tratar o clique diferente (abrir `PjEntriesModal` em vez de `CategoryExpensesModal`)
- Arquivos previstos:
  - `src/main/java/com/financial/service/DashboardService.java` (modificar)
  - `src/main/java/com/financial/repository/DashboardRepository.java` (nova query)
  - `src/main/java/com/financial/dto/BalanceResponse.java` (novo campo `pjTaxes`)

### `CMP-07` PjPage (frontend)

- Responsabilidade: listagem e ponto de entrada para CRUD
- Path: `src/pages/pj/PjPage.tsx`, rota `/pj`
- Layout: PageHeader + filtro ano/mês (mesmo padrão de ExpensesPage) + botão "Novo lançamento" + tabela
- Tabela colunas: Tipo (label traduzido), Ano/Mês, Valor, Arquivo (nome + botão de download), Ações (editar / excluir)
- Estados: loading (spinner), empty ("Nenhum lançamento PJ nesse período."), erro (toast)

### `CMP-08` PjEntryFormModal (frontend)

- Responsabilidade: criar/editar lançamento PJ
- Path: `src/pages/pj/PjEntryFormModal.tsx`
- Campos:
  - Combo `Tipo`: `Nota Fiscal (NF)`, `DAS`, `INSS`, `Contabilidade`
  - Combo `Mês` (1-12) + combo `Ano`
  - `Valor` (usa `CurrencyInput` — mesmo do modal de despesa)
  - `Arquivo` (input `type="file"`, aceita `application/pdf, image/jpeg, image/png`)
- Modos:
  - Criar: todos os campos obrigatórios
  - Editar: `Arquivo` é opcional (mantém o atual se não escolher novo); mostra o nome do arquivo atual como referência
- Validação inline:
  - Valor > 0
  - Arquivo obrigatório em criar
  - Tamanho do arquivo ≤ 5MB (checado no client-side também, antes do upload)
  - Content-type na whitelist (idem)

### `CMP-09` DashboardPage (frontend) — modificação

- Grid dos KPIs: passa de `md:grid-cols-3` para `md:grid-cols-2 lg:grid-cols-4` (2 em tablet, 4 em desktop)
- Novo `KpiCard` "Impostos PJ" (ícone `Briefcase`, tom neutro) — **sempre visível**, mesmo com R$ 0,00 no mês
- Cálculo do `Saldo`: `salary - totalExpenses - pjTaxes`
- Pizza: se `expensesByCategory` inclui a entry sintética "Impostos PJ" (`categoryId === null`), renderiza normal com a cor `#4fdd85`
- Handler de clique na pizza: se `categoryId === null` (fatia sintética "Impostos PJ"), abre `PjEntriesModal` em vez de `CategoryExpensesModal`

### `CMP-10` PjEntriesModal (frontend, dashboard drill-down)

- Responsabilidade: mostrar detalhamento dos encargos PJ do mês selecionado no dashboard
- Path: `src/pages/dashboard/PjEntriesModal.tsx`
- Título: "Impostos PJ — {mês} {ano}"
- Conteúdo:
  - Lista os 3 encargos (DAS, INSS, Contabilidade) do mês — se algum estiver ausente, mostra linha com "—" ou omite (a decidir na implementação)
  - Cada linha: tipo, valor, botão download do comprovante
  - Total no rodapé
- Segue padrão de altura fixa (`min-h-[280px]`) e título colorido (`text-accent`) já usados em `CategoryExpensesModal`

## 7. UI and interaction design

- **Telas alteradas**:
  - `DashboardPage.tsx`: grid dos KPIs de 3 para 4, novo card, novo handler de clique na pizza, novo cálculo de saldo
- **Telas novas**:
  - `PjPage.tsx` (rota `/pj`)
- **Componentes novos**:
  - `PjEntryFormModal.tsx`
  - `PjEntriesModal.tsx`
- **Componentes alterados**:
  - `App.tsx` (ou wherever as rotas ficam) — nova rota `/pj`
  - Sidebar não muda (já é populada dinamicamente pelo endpoint `/api/menus`)
- **Estados visuais**:
  - Loading: skeleton na tabela; spinner no botão de upload durante submit
  - Vazio: mensagem "Nenhum lançamento PJ nesse período."
  - Erro: toast (padrão da app)
  - Sucesso: toast "Lançamento salvo"
  - Disabled: campos durante submit
- **Navegação**:
  - Novo item no menu (populado via `data.sql`): `label = 'PJ'`, `route = '/pj'`, `icon = 'briefcase'`, `sort_order = 7` (depois de "Investimentos" que é 6)
- **Responsividade**:
  - Dashboard KPIs: `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`
  - PjPage tabela: mesmo padrão de scroll horizontal em mobile já usado em outras tabelas
- **Acessibilidade**:
  - Labels associadas aos inputs
  - Botão de download com `aria-label="Baixar {nome do arquivo}"`
  - Combo `Tipo` com labels legíveis (não os valores do enum crus)
- **Regras de conteúdo ou formatação**:
  - Combo `Tipo` mostra: `Nota Fiscal (NF)` / `DAS` / `INSS` / `Contabilidade`
  - Meses no combo: `Janeiro`, `Fevereiro`, ... (reusar `MONTHS` de `utils/months`)
  - Valores em `R$ 1.234,56` (reusar `formatCurrency`)

## 8. Runtime and operations

- **Configuração**:
  - Nova env var: `MINIO_PJ_BUCKET` (default: `financial-pj-files`)
  - `application.yml`:
    ```yaml
    minio:
      # já existente
      bucket: ${MINIO_BUCKET:financial-photos}
      # novo
      pj-bucket: ${MINIO_PJ_BUCKET:financial-pj-files}
    ```
  - `docker-compose.yml` e `docker-compose.dist.yml`: passa `MINIO_PJ_BUCKET` para o container `backend`
  - `docker-compose.yml`: no `minio-init`, adiciona nova linha para criar o bucket **privado** (sem `mc anonymous set public`):
    ```sh
    mc mb --ignore-existing local/${MINIO_PJ_BUCKET}
    ```
  - `application.yml`: aumentar `spring.servlet.multipart.max-file-size` de 2MB para **5MB** e `max-request-size` de 3MB para **6MB** (deixa folga para os campos do form)
- **Feature flags**: nenhuma (feature sempre disponível)
- **Logs**: padrão da app (Spring log em request/response, hibernate SQL em DEBUG). Nenhum log customizado
- **Métricas**: nenhuma configurada nesta iteração
- **Alertas**: nenhum
- **Monitoramento pós-release**: nenhum específico
- **Rollout**:
  - Deploy via `docker-compose build` + `up -d` (padrão do projeto)
  - `ddl-auto=update` cria a tabela `pj_entries` na primeira subida
  - `minio-init` cria o bucket privado na subida (idempotente)
  - `data.sql` insere o novo menu (idempotente via `WHERE NOT EXISTS`)
  - **Ordem de deploy**: backend primeiro (schema + endpoints), depois frontend
- **Rollback**:
  - Reverter as imagens no docker-compose (usando GHCR se remoto)
  - A tabela `pj_entries` pode ficar (não estorva; se quiser limpar, `DROP TABLE pj_entries` manual via DBeaver)
  - Os arquivos no bucket ficam intactos
- **Recuperação ou contingência**:
  - Se o bucket sumir: `docker-compose restart minio-init` recria (mas arquivos são perdidos)
  - Não há backup automático do MinIO nesta versão do projeto

## 9. Security, privacy and compliance

- **Dados sensíveis impactados**:
  - Notas fiscais (NF) e comprovantes de pagamento de impostos são documentos com dados fiscais confidenciais (CNPJ, valor bruto/líquido, dados da empresa cliente)
- **Regras de acesso**:
  - Bucket `financial-pj-files` **privado** (não é público como o de fotos)
  - Download **apenas** via endpoint autenticado `GET /api/pj-entries/{id}/download`
  - O service verifica ownership (`findByIdAndUserId`) antes de servir o arquivo → impossível baixar arquivo de outro user
  - Nenhuma URL de acesso direto ao MinIO é exposta para o frontend
- **Controles obrigatórios**:
  - CSRF token obrigatório em POST/PUT/DELETE (padrão da app; endpoint **NÃO** entra em `CSRF_EXCLUDED`)
  - JWT válido em todos os endpoints (autenticação padrão)
  - Validação server-side do `contentType` do arquivo (não confiar em extensão)
  - Validação server-side do tamanho (`file.getSize() > 5 * 1024 * 1024` → 400)
- **Implicações de privacidade**:
  - Multi-user isolation preservado
  - Delete físico (não soft-delete) — apaga row + arquivo do MinIO. Diego pode limpar histórico se quiser
- **Requisitos regulatórios**: nenhum específico neste momento; boas práticas de tratamento de documento fiscal (não expor publicamente, validar ownership)

## 10. Requirement mapping

### `REQ-17-01` Cadastro de lançamento PJ

- `source_requirement`: conversa Diego 2026-07-31
- Interpretação técnica: form multipart com combo tipo, ano, mês, valor, arquivo → persiste após validação
- Touchpoints: `POST /api/pj-entries`, `PjEntryFormModal`, `PjEntryService.create`
- Contratos impactados: `PjEntryRequest`, `PjEntryResponse`, `PjEntryController.create`
- Estados impactados: `pj_entries` table +1 linha; MinIO bucket +1 arquivo
- Critério de aceite técnico:
  - Cadastrar 1 NF + 1 DAS + 1 INSS + 1 Contabilidade em Julho/2026 → todos criados com 201
  - Tentar cadastrar segundo DAS em Julho/2026 → 409 `PJ_ENTRY_DUPLICATE`
  - Cadastrar com `amount = 0` → 400 `INVALID_PAYLOAD`
  - Cadastrar com arquivo `.docx` → 400 `INVALID_FILE`
  - Cadastrar sem arquivo → 400 (falta do part `file`)
- Testes: unit em `validateFile`, integration no controller (com MockMultipartFile), e2e via curl
- Open questions: nenhuma

### `REQ-17-02` Listagem PJ com filtro

- `source_requirement`: conversa Diego 2026-07-31
- Interpretação técnica: tela `/pj` com filtros ano/mês; se ambos preenchidos, lista do mês; se um vazio, lista tudo do user
- Touchpoints: `GET /api/pj-entries`, `PjPage`
- Contratos impactados: query params `year`, `month` (opcionais)
- Estados impactados: nenhum (leitura)
- Critério de aceite técnico:
  - `GET /api/pj-entries?year=2026&month=7` retorna todos os lançamentos daquele mês do user atual
  - `GET /api/pj-entries` sem params retorna todos do user
- Testes: unit no repository, integration no controller
- Open questions: nenhuma

### `REQ-17-03` Upload e download privado

- `source_requirement`: conversa Diego 2026-07-31 + `feedback-security-browser`
- Interpretação técnica: bucket privado; download stream via endpoint autenticado; ownership check no service
- Touchpoints: `PjFileStorageService`, `GET /api/pj-entries/{id}/download`, `docker-compose.yml`
- Contratos impactados: header `Content-Disposition: attachment; filename="..."`, `Content-Type: {mime}`, `Content-Length`
- Estados impactados: MinIO bucket
- Critério de aceite técnico:
  - `curl http://localhost:9000/financial-pj-files/users/{userId}/{key}` sem auth → 403 do MinIO (bucket privado)
  - `curl -b cookies.txt http://localhost/api/pj-entries/{id}/download` com cookie de user A → arquivo do próprio user OK
  - Usar cookie de user A para baixar id que pertence a user B → 404 (não vaza que o id existe)
- Testes: manual via curl com/sem auth, e verificação da política do bucket
- Open questions: nenhuma

### `REQ-17-04` Editar completo (valor e arquivo)

- `source_requirement`: Decisão 4 (Diego)
- Interpretação técnica: PUT permite substituir tudo, inclusive arquivo (que substitui e apaga o antigo)
- Touchpoints: `PUT /api/pj-entries/{id}`, `PjEntryFormModal` em modo edit
- Contratos impactados: `PjEntryRequest`, `file` opcional
- Estados impactados: linha atualizada; se `file` veio, arquivo antigo apagado no MinIO
- Critério de aceite técnico:
  - Editar só `amount`: linha atualiza, arquivo antigo permanece no bucket
  - Editar `amount` + novo `file`: linha atualiza, arquivo antigo é apagado, novo é gravado
  - Editar tipo `DAS`→`INSS` num mês onde já existe INSS: 409 `PJ_ENTRY_DUPLICATE`
- Testes: unit no service, e2e via curl
- Open questions: nenhuma

### `REQ-17-05` Dashboard integration

- `source_requirement`: conversa Diego 2026-07-31 (Decisão 2 + adenda pizza)
- Interpretação técnica: KPI "Impostos PJ" sempre visível (grid 4x), saldo desconta pjTaxes, fatia "Impostos PJ" (`#4fdd85`) na pizza apenas se `pjTaxes > 0`, clique abre `PjEntriesModal`
- Touchpoints: `DashboardService.balance` (novo campo `pjTaxes`), `DashboardService.expensesByCategory` (entry sintético), `DashboardPage.tsx`, `PjEntriesModal.tsx`
- Contratos impactados: `BalanceResponse` +1 campo (`pjTaxes: BigDecimal`)
- Estados impactados: nenhum (leitura + apresentação)
- Critério de aceite técnico:
  - Sem lançamentos PJ no mês: KPI mostra R$ 0,00; pizza não tem fatia extra; saldo = salário − despesas
  - Com R$ 250 DAS + R$ 300 INSS + R$ 500 Contabilidade no mês: KPI mostra R$ 1.050,00; pizza tem fatia `#4fdd85` proporcional; saldo = salário − despesas − 1050
  - Clicar na fatia "Impostos PJ" abre `PjEntriesModal` (não `CategoryExpensesModal`)
- Testes: integration + manual E2E no browser
- Open questions: se um dos 3 encargos está ausente no mês, `PjEntriesModal` deve mostrar linha "—" ou omitir? **A decidir na implementação**; sugestão: omitir e mostrar só os que existem

### `REQ-17-06` Menu "PJ" no sidebar

- `source_requirement`: Decisão 1 (nome) + Decisão 6 (ícone)
- Interpretação técnica: nova linha no `data.sql` inserindo o menu; sidebar já lê o endpoint `/api/menus` dinamicamente
- Touchpoints: `resources/data.sql`, tabela `menus`
- Contratos impactados: nenhum novo (usa o mesmo `MenuResponse` existente)
- Estados impactados: +1 linha em `menus` após próxima subida com `spring.sql.init.mode=always`
- Critério de aceite técnico:
  - Após deploy, sidebar mostra "PJ" com ícone briefcase logo abaixo de "Investimentos"
  - Clicar leva para `/pj`
- Testes: manual no browser
- Open questions: nenhuma

## 11. Implementation plan input

### `WORK-17A` Backend — entidade + storage + endpoints

- Objetivo: implementar toda a base backend (entidade, repo, service, controller, file storage, config, menu) e testar via curl
- Pré-requisitos: nenhum
- Arquivos alvo:
  - `financial/src/main/java/com/financial/model/PjEntry.java` (novo)
  - `financial/src/main/java/com/financial/model/enums/PjEntryType.java` (novo)
  - `financial/src/main/java/com/financial/repository/PjEntryRepository.java` (novo)
  - `financial/src/main/java/com/financial/service/PjEntryService.java` (novo)
  - `financial/src/main/java/com/financial/service/PjFileStorageService.java` (novo)
  - `financial/src/main/java/com/financial/controller/PjEntryController.java` (novo)
  - `financial/src/main/java/com/financial/dto/PjEntryRequest.java` (novo)
  - `financial/src/main/java/com/financial/dto/PjEntryResponse.java` (novo)
  - `financial/src/main/java/com/financial/mapper/PjEntryMapper.java` (novo)
  - `financial/src/main/java/com/financial/exception/InvalidFileException.java` (novo — ou reusar `InvalidPhotoException` renomeando; a decidir)
  - `financial/src/main/java/com/financial/exception/ApiErrorHandler.java` (modificar — adicionar handler)
  - `financial/src/main/resources/application.yml` (modificar — `minio.pj-bucket`, aumentar `multipart.max-file-size` e `max-request-size`)
  - `financial/src/main/resources/data.sql` (modificar — novo item de menu com `sort_order = 7`)
  - `financial/docker-compose.yml` e `docker-compose.dist.yml` (modificar — passa `MINIO_PJ_BUCKET`; `minio-init` cria bucket privado)
  - `financial/.env.example` (modificar — nova var)
  - `docs/01-database-modeling.md` (opcional — adicionar seção da nova tabela)
- Mudanças esperadas: descrito acima
- Dependências: nenhuma
- Pode ser paralelo: **não** (baseline pra 17B e 17C)
- Como validar:
  - Backend compila (`mvnw clean compile`)
  - Container sobe sem erro
  - `curl -F 'type=DAS' -F 'year=2026' -F 'month=7' -F 'amount=250.00' -F 'file=@teste.pdf' http://localhost/api/pj-entries` cria com 201
  - `curl -X GET http://localhost/api/pj-entries?year=2026&month=7` lista
  - `curl http://localhost/api/pj-entries/{id}/download > out.pdf` baixa
  - `curl http://localhost:9000/financial-pj-files/{key}` sem auth → 403 (bucket privado)

### `WORK-17B` Frontend — PjPage + PjEntryFormModal

- Objetivo: tela `/pj` funcional
- Pré-requisitos: WORK-17A
- Arquivos alvo:
  - `financial-front/src/pages/pj/PjPage.tsx` (novo)
  - `financial-front/src/pages/pj/PjEntryFormModal.tsx` (novo)
  - `financial-front/src/services/pjService.ts` (novo)
  - `financial-front/src/types/pj.ts` (novo)
  - `financial-front/src/App.tsx` (ou onde estão as rotas — modificar)
- Mudanças esperadas: rota `/pj`, listagem, criar/editar/deletar, upload/download
- Dependências: WORK-17A
- Pode ser paralelo: **não** com 17A; **sim** com 17C se 17A já tá pronto
- Como validar: cadastro/edição/exclusão/download via UI, `Ctrl+Shift+R` após rebuild do frontend

### `WORK-17C` Frontend + Backend — Dashboard integration

- Objetivo: KPI, saldo, fatia da pizza e drill-down modal
- Pré-requisitos: WORK-17A (para `BalanceResponse.pjTaxes` e entry sintético em `expensesByCategory`)
- Arquivos alvo:
  - `financial/src/main/java/com/financial/service/DashboardService.java` (modificar)
  - `financial/src/main/java/com/financial/repository/DashboardRepository.java` (modificar — nova query)
  - `financial/src/main/java/com/financial/dto/BalanceResponse.java` (modificar — campo `pjTaxes`)
  - `financial-front/src/types/dashboard.ts` (modificar — campo `pjTaxes`)
  - `financial-front/src/pages/DashboardPage.tsx` (modificar — grid, novo card, handler)
  - `financial-front/src/pages/dashboard/PjEntriesModal.tsx` (novo)
- Mudanças esperadas: descrito acima
- Dependências: WORK-17A
- Pode ser paralelo: **sim** com 17B
- Como validar: dashboard com dados reais mostra KPI, saldo correto, fatia colorida, drill-down modal

## 12. Test plan

- **Testes unitários**:
  - `PjEntryService.validateFile`: aceita PDF/JPG/PNG; rejeita outros; rejeita > 5MB
  - `PjEntryService.create`: cria com sucesso; duplicidade → `ResourceConflictException`; arquivo inválido → `InvalidFileException`
  - `PjEntryService.update`: atualiza sem file (mantém file antigo); atualiza com file (apaga antigo)
  - `DashboardService.balance`: `pjTaxes` calculado corretamente (soma DAS+INSS+ACCOUNTING, exclui INVOICE)
  - `DashboardService.expensesByCategory`: adiciona entry sintético só quando `pjTaxes > 0`
- **Testes de widget ou UI**: sem framework de testes no front do projeto atual (`vitest`/`testing-library` não configurados); manual conta
- **Testes de integração**:
  - `PjEntryController` (Spring `@SpringBootTest` + `@AutoConfigureMockMvc`) — CRUD completo, upload, download, permissões
  - Bucket privado: teste que confirma que URL direta ao MinIO retorna 403
- **Testes de contrato**: N/A (sem API externa)
- **Testes manuais** (checklist para Diego):
  - [ ] Cadastrar 1 NF + 1 DAS + 1 INSS + 1 Contabilidade em Julho/2026
  - [ ] Tentar cadastrar segundo DAS em Julho → 409 com mensagem clara
  - [ ] Editar valor sem trocar arquivo
  - [ ] Editar trocando arquivo (verifica no MinIO que o antigo sumiu — via DBeaver ou console)
  - [ ] Excluir um lançamento (verifica que arquivo sumiu do MinIO)
  - [ ] Baixar arquivo via endpoint autenticado
  - [ ] Verificar que URL direta ao MinIO retorna 403 sem auth
  - [ ] Dashboard: KPI "Impostos PJ" mostra R$ 0,00 no mês vazio
  - [ ] Dashboard: KPI mostra soma correta com lançamentos
  - [ ] Dashboard: saldo desconta impostos
  - [ ] Pizza: fatia `#4fdd85` aparece quando há impostos
  - [ ] Pizza: clique na fatia abre `PjEntriesModal` correto
  - [ ] Menu "PJ" aparece no sidebar com ícone briefcase
  - [ ] Upload de arquivo .docx → erro claro
  - [ ] Upload de PDF > 5MB → erro claro
- **Regressões obrigatórias**:
  - Dashboard sem PJ continua funcional (mesma aparência que hoje, exceto pelo card extra "Impostos PJ" com R$ 0,00)
  - Menu de despesas continua funcionando
  - Foto de perfil (bucket público) continua funcionando (não confundir com bucket novo)

## 13. Open items

- **Bloqueios**: nenhum
- **Riscos**:
  - Grid do dashboard passando de 3 para 4 colunas pode ficar apertado em breakpoints intermediários (`md`) — precisa validação visual em ~768px de largura
  - Endpoint de download stream: se arquivo for muito grande (~5MB), pode segurar thread do Tomcat por alguns segundos. Aceitável para uso pessoal
  - `data.sql` idempotente: nova linha usa `WHERE NOT EXISTS (SELECT 1 FROM menus WHERE label = 'PJ')` — validar se após deploy o menu aparece
- **Decisões pendentes** (a resolver na implementação):
  - Nome exato do DTO: `PjEntryRequest` para criar + update, ou `PjEntryCreateRequest` + `PjEntryUpdateRequest` separados? Sugestão: um só, `PjEntryRequest`, com todos os campos, e o service decide o que fazer (menos código)
  - `PjEntriesModal`: se um dos 3 tipos de encargo está ausente no mês, mostra "—" ou omite? Sugestão: omitir
  - Reusar `InvalidPhotoException` (renomear para `InvalidFileException`) ou criar nova? Sugestão: criar `InvalidFileException` nova e deixar `InvalidPhotoException` intacta (menor risco de regressão em signup)
  - `sort_order` do menu: assumido 7 (após Investimentos = 6). Confirmar no `data.sql`
- **Assunções temporárias**:
  - Diego tem 1 único cliente PJ → 1 NF por mês. Se mudar, revisitar o UNIQUE constraint
  - Diego tem 3 tipos fixos de encargo (DAS, INSS, Contabilidade). Se surgir 4º (ex: ISS trimestral, IR anual), decidir se vira novo `type` no enum ou entidade separada
