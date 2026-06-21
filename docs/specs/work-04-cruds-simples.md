# Spec WORK-04 — CRUDs simples (Category, BankAccount, Investment, Menu read-only)

> Fase 4. Três CRUDs padrão + endpoint read-only de menus.

---

## Metadados
- **spec_id:** `WORK-04`
- **titulo_tecnico:** CRUDs de `ExpenseCategory`, `BankAccount`, `Investment` (4 verbs cada, com soft-delete, isolamento por user, MapStruct) + `GET /api/menus`
- **source_product_spec:** `PLAN-01`
- **baseline:** pós-WORK-03
- **target_branch:** `feature/work-04-cruds`
- **escopo_sistema:** `financial`
- **última_atualização:** 2026-05-31

---

## 1. Objective
Implementar os 3 CRUDs simples + endpoint read-only de menus. Cada CRUD com: Controller, Service, Repository, DTOs (Request/Response), MapStruct mapper, validação Jakarta, isolamento por `user_id` extraído do `SecurityContext`, soft-delete via `active=false`.

**Fora:** Salary (WORK-05), Expense+Installment (WORK-06), Dashboard (WORK-07).

---

## 2. System overview
- **Atual:** auth funcional (WORK-03), banco com tabelas (WORK-02), nenhum endpoint de domínio.
- **Alvo:** 3 entidades com CRUD completo + endpoint `GET /api/menus` retornando árvore de menus ativos.
- **Restrições:** isolamento total por user; DELETE físico proibido (soft-delete via `active=false`); MapStruct obrigatório (D-06).

---

## 3. Architecture
Adiciona triplets (Controller/Service/Repository) + DTOs + Mappers em pacotes correspondentes. Sem mudança estrutural.

---

## 4. Data design
- Sem novas tabelas; usa as criadas em WORK-02.
- Seed via `data.sql` para `menus` (será criado nesta fase, na primeira subida pós-restart):
  ```sql
  INSERT INTO menus (id, label, route, icon, sort_order, active, created_date, updated_date) VALUES
    (gen_random_uuid(), 'Dashboard', '/dashboard', 'home', 1, true, now(), now()),
    (gen_random_uuid(), 'Categorias', '/categories', 'tag', 2, true, now(), now()),
    (gen_random_uuid(), 'Contas Bancárias', '/bank-accounts', 'credit-card', 3, true, now(), now()),
    (gen_random_uuid(), 'Salários', '/salaries', 'dollar-sign', 4, true, now(), now()),
    (gen_random_uuid(), 'Despesas', '/expenses', 'shopping-cart', 5, true, now(), now()),
    (gen_random_uuid(), 'Investimentos', '/investments', 'trending-up', 6, true, now(), now());
  ```
- `data.sql` em `src/main/resources/`, idempotente via `INSERT ... ON CONFLICT DO NOTHING`.

---

## 5. Interface design

**Padrão para cada recurso (`/api/{recurso}`):**

| Método | Path | Auth | Comportamento |
|---|---|---|---|
| GET | `/api/{recurso}` | JWT | Lista do user logado, filtrado por `active=true` por default. Query param `?includeInactive=true` retorna todos. |
| GET | `/api/{recurso}/{id}` | JWT | Retorna item. 404 se não existir ou pertencer a outro user. |
| POST | `/api/{recurso}` | JWT | Cria. Valida payload. 201 + item criado. |
| PUT | `/api/{recurso}/{id}` | JWT | Atualiza. 404 / 422. |
| DELETE | `/api/{recurso}/{id}` | JWT | **Soft-delete** (`active=false`). 204. |

**Recursos:**
- `/api/categories` (ExpenseCategory)
- `/api/bank-accounts` (BankAccount)
- `/api/investments` (Investment)

**Menu (read-only):**
- `GET /api/menus` → JWT → retorna lista de menus com `active=true`, ordenada por `sort_order`, montada em árvore se houver `parent_id`.

---

## 6. Component design

Para cada recurso (Category/BankAccount/Investment), criar:

- `{X}Repository extends JpaRepository<{X}, UUID>` — métodos `findByUserId(UUID)`, `findByIdAndUserId(UUID, UUID)`.
- `{X}Service` — `@Service @Transactional`. Métodos `list, get, create, update, softDelete`. Extrai `userId` via `SecurityContextHolder` (helper `CurrentUser.id()`).
- `{X}Controller` — `@RestController @RequestMapping("/api/{recurso}")`. 5 métodos REST.
- `{X}Request` (record) — payload de POST/PUT, com `@NotBlank`, `@Size`, etc.
- `{X}Response` (record) — payload de GET, sem expor relações sensíveis.
- `{X}Mapper` (interface com `@Mapper(componentModel=SPRING)`) — `toEntity(Request)`, `toResponse(Entity)`, `updateEntityFromRequest(Request, @MappingTarget Entity)`.

**Helper compartilhado:**
- `CurrentUser` (utility class no package `config/` ou `security/`) — método estático `id()` retorna `UUID` do user logado (lança `IllegalStateException` se não houver contexto, mas isso nunca deve acontecer pois o filtro garante).

**MenuController** (read-only):
- `GET /api/menus` → consulta `MenuRepository.findByActiveTrueOrderBySortOrder()`, monta árvore se houver `parent_id`, retorna `List<MenuResponse>` onde cada nó tem `children: List<MenuResponse>`.

---

## 7. UI
N/A (telas vêm na WORK-09).

---

## 8. Runtime/ops
- Adicionar dependency MapStruct ao `pom.xml` do `financial`:
  ```xml
  <dependency>
    <groupId>org.mapstruct</groupId>
    <artifactId>mapstruct</artifactId>
    <version>1.6.3</version>
  </dependency>
  ```
  + annotation processor no `maven-compiler-plugin`.
- Adicionar `data.sql` em `src/main/resources/`.
- `application.yml`: `spring.jpa.defer-datasource-initialization=true` + `spring.sql.init.mode=always` (ou `never` em prod; controlado por env).
- Sem novas env vars.

---

## 9. Security
- Toda query/insert/update filtra por `user_id` do contexto. **Tentativa de acessar item de outro user → 404** (não 403, para não vazar existência).
- DELETE físico proibido — verificado em code review.

---

## 10. Requirement mapping
- **REQ-02** (Categoria) ✅
- **REQ-05** (BankAccount) ✅
- **REQ-06** (Investment) ✅
- **REQ-10** (Menus, parte read) ✅
- **D-03** (Multi-user) — implementação real começa aqui.

---

## 11. Implementation plan input

| Sub-WORK | Objetivo |
|---|---|
| WORK-04.1 | Setup MapStruct (pom + compiler plugin) |
| WORK-04.2 | `CurrentUser` helper |
| WORK-04.3 | CRUD `ExpenseCategory` (repo + service + controller + DTOs + mapper) |
| WORK-04.4 | CRUD `BankAccount` |
| WORK-04.5 | CRUD `Investment` |
| WORK-04.6 | `data.sql` com seed de menus + `MenuController` (GET only) + DTO de árvore |
| WORK-04.7 | Postman collection + smoke test |

---

## 12. Test plan
- **Unit:** `{X}ServiceTest` para cada recurso — mocks de Repository, validar isolamento e soft-delete.
- **Integração:** `@SpringBootTest` + Testcontainers — fluxo completo CRUD para 1 recurso (Category); isolamento entre 2 users.
- **Manual:** Postman collection com 5 cenários por recurso + smoke do isolamento (2 logins, cada um vê só os seus).

---

## 13. Open items
- **O-12:** Paginação? Recomendo **não** nesta fase — listas serão pequenas (categorias, contas, investimentos pessoais). Pode entrar como follow-up.
- **O-13:** Filtros (ex: buscar categoria por nome)? Recomendo **não** nesta fase — pode entrar quando necessário.
- **O-14:** Endpoint `PATCH` para mudar só `active`? Recomendo **não** — DELETE faz o mesmo (soft-delete). PATCH só se a fase 11/12 trouxer a tela de admin.

---

## Critério de "pronto"
```
[ ] MapStruct configurado e gerando mappers em target/generated-sources
[ ] CurrentUser helper implementado
[ ] CRUD Category: 5 endpoints, isolamento, soft-delete, validação
[ ] CRUD BankAccount: idem
[ ] CRUD Investment: idem
[ ] data.sql com 6 menus, GET /api/menus retorna árvore correta
[ ] Postman collection valida cada cenário
[ ] Testes unit + integração passam
[ ] Diego aprova explicitamente
```
