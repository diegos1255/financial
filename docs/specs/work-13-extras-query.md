# Spec WORK-13 — Extras de query (paginação, filtros, PATCH /active)

> **Status:** stub de backlog. Origem: Open Items O-12/O-13/O-14 da `work-04-cruds-simples.md`, descartados daquela fase por decisão do Diego em 2026-06-05 (opção C — "criar spec stub WORK-13"). Esta spec **não** está aprovada para implementação — vai ser detalhada e aprovada quando a fase for puxada.

---

## Metadados
- **spec_id:** `WORK-13`
- **titulo_tecnico:** Extras de query nos CRUDs simples — paginação, filtros simples (busca por nome / activeOnly) e PATCH para reativar item soft-deletado
- **source_product_spec:** `PLAN-01`
- **baseline:** pós-WORK-04 (depende dos 3 CRUDs estarem implementados)
- **target_branch:** `feature/work-13-extras-query` (a criar quando puxada)
- **escopo_sistema:** `financial`
- **última_atualização:** 2026-06-05 (criação do stub)

---

## 1. Objective
Implementar três extras nos CRUDs `/api/categories`, `/api/bank-accounts`, `/api/investments` que não entraram na WORK-04 por decisão consciente de não construir antes da hora:

1. **Paginação** — `?page=&size=` retornando `Page<{X}Response>`.
2. **Filtros simples** — busca por nome (`?q=`) e/ou flag `?activeOnly=`.
3. **PATCH `/{id}/active`** — reativar item soft-deletado (mudar `active` de `false` para `true`).

**Fora:** filtros complexos (range de data, joins múltiplos), full-text search, paginação cursor-based.

---

## 2. System overview
- **Pré-condição:** WORK-04 entregou os 3 CRUDs com `list`, `get`, `create`, `update`, `softDelete`. Esta fase só **estende** os endpoints existentes, sem mudar contratos já consumidos.
- **Gatilho para puxar:** alguma das seguintes condições:
  - O front (WORK-09) começa a sofrer com listas grandes e pede paginação.
  - Surge necessidade real de buscar item por nome (ex: muitas categorias e UX precisa de filtro).
  - Necessidade de reativar item soft-deletado (provavelmente quando ganhar tela de admin, hoje não planejada).

---

## 3. Architecture
Sem mudança estrutural. Atualizações pontuais em `{X}Repository` (Specifications ou métodos derivados), `{X}Service` (assinatura `list` passa a aceitar `Pageable` + filtros opcionais), `{X}Controller` (novos query params + novo endpoint `PATCH`).

---

## 4. Data design
Sem novas tabelas ou colunas. Usa o `active` já existente.

---

## 5. Interface design

**Mudanças nos endpoints `GET /api/{recurso}` (de cada um dos 3 recursos):**
- Adiciona query params `?page=`, `?size=`, `?sort=`, `?q=`, `?activeOnly=`.
- Default: `page=0`, `size=20`, `activeOnly=true`, `q` ausente (sem filtro).
- Response passa de `List<{X}Response>` para `Page<{X}Response>` (com `content`, `totalElements`, `totalPages`, `number`, `size`).

**Novo endpoint por recurso:**
| Método | Path | Auth | Comportamento |
|---|---|---|---|
| PATCH | `/api/{recurso}/{id}/active` | JWT | Body `{ "active": boolean }`. Atualiza só o flag. 404 se não existir / pertencer a outro user. 204 ou 200 com item atualizado. |

---

## 6. Component design
- `{X}Repository` ganha `findAll(Specification, Pageable)` ou métodos derivados específicos.
- `{X}Service.list(Pageable, filters)` — combina `userId` (sempre) + `activeOnly` + `q` em uma Specification.
- `{X}Service.setActive(UUID id, boolean active)` — só atualiza o campo.
- `{X}Controller` — `@RequestParam(required = false)` para os filtros + `Pageable` injetado pelo Spring.

---

## 7. UI
Front (WORK-09) precisa adaptar suas listas pra consumir `Page<...>` em vez de `List<...>`. Coordenar essa fase com mudança no front se WORK-09 já estiver entregue.

---

## 8. Runtime/ops
Sem novas deps. `spring-data-jpa` já traz `Pageable` e `Specifications`. Sem nova env var.

---

## 9. Security
- Toda Specification combina **obrigatoriamente** com `userId = current user`.
- PATCH `/active` segue o mesmo isolamento: 404 (não 403) se item for de outro user.

---

## 10. Requirement mapping
- Não há `REQ-XX` formal para esses itens — são UX/qualidade de vida. Reflete realidade do uso pós-WORK-09.

---

## 11. Implementation plan input

| Sub-WORK | Objetivo |
|---|---|
| WORK-13.1 | Paginação nos 3 GET list (Pageable + Page response) |
| WORK-13.2 | Filtros `?q=` e `?activeOnly=` (Specifications) |
| WORK-13.3 | PATCH `/{id}/active` nos 3 recursos |
| WORK-13.4 | Postman collection cobrindo todos os cenários novos |

---

## 12. Test plan
- **Unit:** validar Specifications combinam corretamente (userId + activeOnly + q).
- **Integração:** Testcontainers — paginar 50 categorias, buscar por q parcial, reativar item soft-deletado.
- **Manual:** Postman.

---

## 13. Open items
- **O-15:** Default `activeOnly=true` vs `false`? Recomendo `true` (lista comum não quer ver lixo). Quando puxar, confirmar com Diego.
- **O-16:** Endpoint PATCH retorna 200 com item ou 204 vazio? Decidir quando puxar.
- **O-17:** Permitir `?sort=field,direction` ou fixar ordenação por nome/created_date? Decidir quando puxar.

---

## Critério de "pronto"
```
[ ] Spec detalhada e aprovada pelo Diego (este stub não conta)
[ ] Paginação implementada nos 3 CRUDs sem quebrar contratos de outros endpoints
[ ] Filtros ?q= e ?activeOnly= funcionando, sempre combinados com userId
[ ] PATCH /{id}/active funcional + 404 para item de outro user
[ ] Front (se já existir) adaptado pra Page<...>
[ ] Postman valida cada cenário
[ ] Diego aprova explicitamente
```
