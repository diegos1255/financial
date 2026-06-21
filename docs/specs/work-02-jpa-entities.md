# Spec WORK-02 — Entidades JPA

> Fase 2 do plano-mãe `02-development-plan.md`. Template SDD.

---

## Metadados
- **spec_id:** `WORK-02`
- **titulo_tecnico:** Mapeamento das 8 entidades JPA + BaseEntity + enums, geração das tabelas via `ddl-auto=update`
- **source_product_spec:** `PLAN-01`, `docs/01-database-modeling.md`
- **baseline:** estado pós-WORK-01
- **target_branch:** `feature/work-02-jpa-entities`
- **escopo_sistema:** `financial`
- **última_atualização:** 2026-05-31

---

## 1. Objective
Mapear todas as entidades JPA conforme `01-database-modeling.md`, com base entity auditável, enums, constraints e relacionamentos. Subir o app e validar que as 8 tabelas foram criadas no Postgres com colunas, FKs, indexes e CHECKs corretos.

**Fora:** repositórios, services, controllers, validações no nível de API (vêm na WORK-04+). Aqui só entity + enum + base. Repositórios serão `JpaRepository<Entity, UUID>` triviais criados sob demanda nas próximas fases.

---

## 2. System overview
- **Atual:** WORK-01 concluída; app sobe e conecta no Postgres, sem entidades.
- **Alvo:** 8 tabelas criadas pelo Hibernate na primeira subida: `users`, `bank_accounts`, `expense_categories`, `salaries`, `expenses`, `installments`, `investments`, `menus`.
- **Restrições:** `ddl-auto=update`, UUID como PK, NUMERIC(12,2) para dinheiro, TIMESTAMPTZ, snake_case, soft-delete via campo nas entidades pertinentes.

---

## 3. Architecture
Adiciona o package `model/` e `model/enums/` com classes JPA. Não muda arquitetura externa.

---

## 4. Data design

**Referência única:** `docs/01-database-modeling.md`. Esta spec mapeia 1:1 cada tabela em uma entidade JPA.

**BaseEntity (`@MappedSuperclass`):**
- `id UUID` (gerada via `UUID.randomUUID()` em `@PrePersist`)
- `created_date TIMESTAMPTZ` (preenchida em `@PrePersist`)
- `updated_date TIMESTAMPTZ` (preenchida em `@PrePersist` e `@PreUpdate`)

**Enums (em `model/enums/`):**
- `ExpenseType` — `FIXED, INSTALLMENT`
- `ExpenseStatus` — `ACTIVE, CANCELLED`
- `InstallmentStatus` — `PENDING, PAID, CANCELLED, ANTICIPATED`

**Entidades:**
| Classe | Tabela | Notas-chave |
|---|---|---|
| `User` | `users` | `@Column(name="login", unique=true)`, `@JsonIgnore` na senha. |
| `BankAccount` | `bank_accounts` | `@ManyToOne User`; índice composto `(user_id, active)`. |
| `ExpenseCategory` | `expense_categories` | `UNIQUE(user_id, name)`. |
| `Salary` | `salaries` | `UNIQUE(user_id, reference_year, reference_month)`, `@Check` para `reference_month BETWEEN 1 AND 12`. |
| `Expense` | `expenses` | `@Enumerated(STRING)` para type/status; constraint check via `@Check`: se INSTALLMENT, `installments_count` NOT NULL. |
| `Installment` | `installments` | `@ManyToOne Expense` com `CascadeType.ALL`, `UNIQUE(expense_id, installment_number)`. |
| `Investment` | `investments` | `UNIQUE(user_id, ticker)` partial (Hibernate cria como unique normal — partial via @Filter ou migration). Por ora, unique total. |
| `Menu` | `menus` | Self-reference `@ManyToOne Menu parent`; sem user_id. |

**ddl-auto=update:** cuidado documentado — renames e mudanças de tipo NÃO são aplicados; nesses casos, drop manual do schema é aceitável neste projeto educacional.

---

## 5. Interface design
N/A — não há novos endpoints nesta fase.

---

## 6. Component design
8 classes `@Entity` em `com.financial.model` + 3 enums em `com.financial.model.enums` + 1 `BaseEntity` em `com.financial.model`.

Cada entidade segue padrão:
```java
@Entity
@Table(name = "...")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
@EqualsAndHashCode(of = "id", callSuper = false)
public class X extends BaseEntity { ... }
```

---

## 7. UI
N/A.

---

## 8. Runtime/ops
- `application.yml` mantém `ddl-auto=update`.
- Logs `org.hibernate.SQL=DEBUG` mostram CREATE TABLE no startup.
- Nenhuma nova env var.

---

## 9. Security
Senha (`User.password`) marcada com `@JsonIgnore` para nunca aparecer em responses. Sem isso, o futuro mapper poderia vazá-la.

---

## 10. Requirement mapping
Pré-requisito de REQ-01 a REQ-12. Não implementa nenhum sozinho.

---

## 11. Implementation plan input

| Sub-WORK | Objetivo | Arquivos |
|---|---|---|
| WORK-02.1 | `BaseEntity` + listeners | `model/BaseEntity.java` |
| WORK-02.2 | 3 enums | `model/enums/{ExpenseType,ExpenseStatus,InstallmentStatus}.java` |
| WORK-02.3 | `User` | `model/User.java` |
| WORK-02.4 | `BankAccount`, `ExpenseCategory`, `Investment`, `Menu` | 4 arquivos |
| WORK-02.5 | `Salary` (com unique composto) | `model/Salary.java` |
| WORK-02.6 | `Expense` + `Installment` (com relacionamento e cascade) | 2 arquivos |
| WORK-02.7 | Subir app, validar tabelas no pgAdmin | — |

---

## 12. Test plan
- **Unit:** N/A (entidades sem lógica).
- **Integração:** `@DataJpaTest` simples por entidade — salvar uma instância, recuperar, comparar.
- **Manual:** abrir pgAdmin, expandir `financial.public`, conferir 8 tabelas + constraints + FKs.

---

## 13. Open items
- **O-06:** Adotar Hibernate `@SQLDelete` para soft-delete automático? Recomendo **não** nesta fase — controle explícito no service é mais didático e evita "magia". Pode entrar em refactor futuro.
- **O-07:** `Installment` com cascade ALL ou só PERSIST/MERGE? Recomendo **CascadeType.ALL** com `orphanRemoval=false` (cancelamento marca, não apaga).
- **O-08:** Carregamento — `@ManyToOne` default é EAGER. Trocar para LAZY já agora? Recomendo **LAZY explícito** em todos `@ManyToOne` (boa prática, evita N+1 surpresas).

---

## Critério de "pronto"
```
[ ] BaseEntity com audit funcionando
[ ] 3 enums criados
[ ] 8 entidades mapeadas
[ ] Subir app: log mostra 8 "create table" sem erro
[ ] pgAdmin lista 8 tabelas com FKs e constraints corretas
[ ] @DataJpaTest passa para cada entidade
[ ] Diego aprova explicitamente
```
