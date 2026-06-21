# WORK-09G — Controle de Pagamento de Parcelas

**Status:** [x] Plano aprovado  [x] Spec aprovada  [x] Implementado

---

## Objetivo

Permitir que o usuário marque parcelas de despesas INSTALLMENT como pagas (PAID ou ANTICIPATED) e as desfaça (volta a PENDING). O dashboard passa a contabilizar parcelas antecipadas no mês em que foram efetivamente pagas, não no mês do vencimento.

---

## Semântica de status (decisão firmada)

| Status | Quando | Conta no dashboard em qual mês |
|---|---|---|
| `PENDING` | Padrão ao criar | Mês do `dueDate` |
| `PAID` | Paga no mês do vencimento (ou depois) | Mês do `dueDate` |
| `ANTICIPATED` | Paga antes do mês do vencimento | Mês do `paid_at` (data real do pagamento) |
| `CANCELLED` | Despesa cancelada em cascata | Não conta |

**Regra de classificação automática no backend:**
- Se `paidAt.toLocalDate() <= dueDate` do mesmo mês (ou seja, `paidAt` está no mesmo mês de `dueDate` ou anterior mesmo mês): `PAID`... na prática: se `paidAt.toLocalDate() >= firstDayOf(dueDate.month)` → `PAID`, senão → `ANTICIPATED`
- Simplificado: se `YearMonth.from(paidAt) == YearMonth.from(dueDate)` → `PAID`; se antes → `ANTICIPATED`
- O frontend não precisa conhecer essa distinção — envia só `paidAt`

---

## Backend

### 1. `InstallmentPayRequest.java` (novo DTO)

```java
public record InstallmentPayRequest(
    LocalDate paidAt  // opcional; se null, usa LocalDate.now()
) {}
```

### 2. `InstallmentRepository.java`

Adicionar método de busca segura (garante ownership via user):

```java
@Query("""
    SELECT i FROM Installment i
      JOIN i.expense e
     WHERE i.id = :id
       AND e.user.id = :userId
    """)
Optional<Installment> findByIdAndUserId(@Param("id") UUID id, @Param("userId") UUID userId);
```

### 3. `InstallmentService.java` — dois novos métodos

**`markAsPaid(UUID id, UUID userId, LocalDate paidAt)`:**
- Busca parcela via `findByIdAndUserId` → 404 se não encontrar
- Valida: só `PENDING` pode virar pago → 422 `INSTALLMENT_ALREADY_PROCESSED` se não for
- Determina status: `YearMonth.from(paidAt) == YearMonth.from(installment.getDueDate())` → `PAID`; se `paidAt` for mês anterior ao `dueDate` → `ANTICIPATED`
- Seta `status` e `paidAt = paidAt.atStartOfDay(ZoneOffset.UTC)`
- Retorna `InstallmentResponse`

**`markAsPending(UUID id, UUID userId)`:**
- Busca parcela via `findByIdAndUserId` → 404 se não encontrar
- Valida: só `PAID` ou `ANTICIPATED` pode voltar a `PENDING` → 422 `INSTALLMENT_NOT_PAID` se não for
- Seta `status = PENDING`, `paidAt = null`
- Retorna `InstallmentResponse`

### 4. `InstallmentController.java` (novo)

```java
@RestController
@RequestMapping("/api/installments")
public class InstallmentController {

    @PatchMapping("/{id}/pay")
    @ResponseStatus(HttpStatus.OK)
    public InstallmentResponse pay(@PathVariable UUID id,
                                   @RequestBody(required = false) InstallmentPayRequest request) {
        LocalDate paidAt = (request != null && request.paidAt() != null)
                ? request.paidAt()
                : LocalDate.now();
        return installmentService.markAsPaid(id, CurrentUser.id(), paidAt);
    }

    @PatchMapping("/{id}/unpay")
    @ResponseStatus(HttpStatus.OK)
    public InstallmentResponse unpay(@PathVariable UUID id) {
        return installmentService.markAsPending(id, CurrentUser.id());
    }
}
```

### 5. Novas exceções

- `InstallmentAlreadyProcessedException` → 422, `code: INSTALLMENT_ALREADY_PROCESSED`
- `InstallmentNotPaidException` → 422, `code: INSTALLMENT_NOT_PAID`

Registrar em `ApiErrorHandler`.

### 6. `InstallmentMapper.java` (novo ou via método estático no service)

Mapear `Installment → InstallmentResponse`. Como `InstallmentResponse` já existe e tem os mesmos campos da entidade, criar um mapper MapStruct simples:

```java
@Mapper(componentModel = "spring")
public interface InstallmentMapper {
    InstallmentResponse toResponse(Installment entity);
}
```

### 7. `DashboardRepository.java` — refatorar `sumInstallments` e `sumInstallmentsByCategory`

**Nova lógica (Opção B — ANTICIPATED conta no mês do `paid_at`):**

```jpql
-- sumInstallments
WHERE (
  (i.status IN (:paidStatuses) AND i.dueDate BETWEEN :startOfMonth AND :endOfMonth)
  OR
  (i.status = :anticipated AND CAST(i.paidAt AS LocalDate) BETWEEN :startOfMonth AND :endOfMonth)
)
```

Onde `paidStatuses = [PENDING, PAID]` e `anticipated = ANTICIPATED`.

Isso substitui a lista `COUNTABLE_INSTALLMENT_STATUSES` que existia antes (remover a constante ou manter só internamente).

**Novos métodos para breakdown:**

```java
// Parcelas pagas no mês (PAID com dueDate no mês + ANTICIPATED com paidAt no mês)
BigDecimal sumInstallmentsPaid(UUID userId, LocalDate startOfMonth, LocalDate endOfMonth)

// Parcelas ainda pendentes no mês (PENDING com dueDate no mês)
BigDecimal sumInstallmentsPending(UUID userId, LocalDate startOfMonth, LocalDate endOfMonth)
```

Igualmente para `sumInstallmentsByCategory` e variantes `ByCategory`.

### 8. `BalanceBreakdown.java`

```java
public record BalanceBreakdown(
    BigDecimal fixed,
    BigDecimal installments,         // total = installmentsPaid + installmentsPending
    BigDecimal installmentsPaid,     // novo
    BigDecimal installmentsPending,  // novo
    BigDecimal variable
) {}
```

`installments` continua existindo para não quebrar contrato com o front.

### 9. `DashboardService.java`

Adicionar chamadas a `sumInstallmentsPaid` e `sumInstallmentsPending` e incluir no `BalanceBreakdown`.

---

## Frontend

### 1. `types/dashboard.ts`

```ts
export type BalanceBreakdown = {
  fixed: number;
  installments: number;
  installmentsPaid: number;    // novo
  installmentsPending: number; // novo
  variable: number;
};
```

### 2. `services/installmentService.ts` (novo)

```ts
import { api } from './api';
import type { Installment } from '../types/expense';

export const installmentService = {
  async markPaid(id: string, paidAt?: string): Promise<Installment> {
    const { data } = await api.patch<Installment>(`/api/installments/${id}/pay`,
      paidAt ? { paidAt } : {}
    );
    return data;
  },
  async markPending(id: string): Promise<Installment> {
    const { data } = await api.patch<Installment>(`/api/installments/${id}/unpay`);
    return data;
  },
};
```

### 3. `InstallmentsList.tsx` (novo componente)

Recebe `expenseId: string` e `onUpdated: () => void`.

Busca as parcelas via `expenseService.getInstallments(expenseId)` (endpoint já existe: `GET /api/expenses/{id}/installments`).

Exibe tabela inline com colunas: `#` | Vencimento | Valor | Status | Ações

**Por status:**
- `PENDING` → badge cinza + botão verde "Pagar" → abre mini formulário inline (date input com default = hoje) + botão "Confirmar"
- `PAID` → badge verde "Paga" + data de pagamento + botão ghost "Desfazer"
- `ANTICIPATED` → badge indigo "Antecipada" + data de pagamento + botão ghost "Desfazer"
- `CANCELLED` → badge slate "Cancelada" + sem botão

O mini formulário de pagamento fica inline na própria linha (não abre modal).

### 4. `ExpensesPage.tsx`

Adicionar expansão de parcelas para linhas INSTALLMENT:

- Nova coluna "Parcelas" na tabela: para INSTALLMENT, mostra badge de progresso `X/Y pagas` (onde X = PAID + ANTICIPATED, Y = total). Para FIXED/VARIABLE, vazio.
- Botão `ChevronDown`/`ChevronUp` na coluna de ações para INSTALLMENT.
- Quando expandido, renderiza `<InstallmentsList>` em uma linha extra abaixo (usando `colSpan` full-width).
- Estado `expandedId: string | null` controla qual está expandida.

### 5. `DashboardPage.tsx`

Atualizar subtitle do KPI "Total de Despesas":

```tsx
subtitle={
  balance
    ? `Fixas: ${formatCurrency(balance.breakdown.fixed)} • ` +
      `Pagas: ${formatCurrency(balance.breakdown.installmentsPaid)} • ` +
      `Pendentes: ${formatCurrency(balance.breakdown.installmentsPending)} • ` +
      `Variáveis: ${formatCurrency(balance.breakdown.variable)}`
    : undefined
}
```

---

## Fluxo end-to-end (ANTICIPATED)

```
Usuário abre ExpensesPage → expande parcela #5 (vence outubro)
→ clica "Pagar" → informa data 10/06/2026
→ frontend: PATCH /api/installments/{id}/pay { paidAt: "2026-06-10" }
→ backend: YearMonth(2026-06) != YearMonth(2026-10) → status = ANTICIPATED, paidAt = 2026-06-10T00:00:00Z
→ dashboard junho: sumInstallments inclui esta parcela (CAST(paidAt AS LocalDate) BETWEEN 01-06 AND 30-06)
→ dashboard outubro: parcela NÃO aparece no total (status ANTICIPATED, dueDate no mês mas não conta por PENDING/PAID)
→ tela de parcelas outubro: parcela APARECE listada com badge "Antecipada" (visibilidade histórica)
```

---

## Validações

| Regra | Onde | Código de erro |
|---|---|---|
| Só PENDING pode ser pago | Service | `INSTALLMENT_ALREADY_PROCESSED` (422) |
| Só PAID/ANTICIPATED pode ser desfeito | Service | `INSTALLMENT_NOT_PAID` (422) |
| Parcela deve pertencer ao user logado | Repository query | 404 |
| `paidAt` não pode ser no futuro | Service | `INVALID_PAYMENT_DATE` (422) |

---

## Arquivos alterados/criados

**Backend:**
- `InstallmentPayRequest.java` (novo)
- `InstallmentAlreadyProcessedException.java` (novo)
- `InstallmentNotPaidException.java` (novo)
- `InstallmentMapper.java` (novo)
- `InstallmentController.java` (novo)
- `InstallmentRepository.java` (+ `findByIdAndUserId`)
- `InstallmentService.java` (+ `markAsPaid`, `markAsPending`)
- `DashboardRepository.java` (refatorar queries + novos métodos paid/pending)
- `BalanceBreakdown.java` (+ `installmentsPaid`, `installmentsPending`)
- `DashboardService.java` (usar novos métodos)
- `ApiErrorHandler.java` (+ 2 handlers)

**Frontend:**
- `types/dashboard.ts` (+ `installmentsPaid`, `installmentsPending`)
- `services/installmentService.ts` (novo)
- `components/expenses/InstallmentsList.tsx` (novo)
- `pages/expenses/ExpensesPage.tsx` (+ expansão + badge progresso)
- `pages/DashboardPage.tsx` (+ subtitle parcelas pagas/pendentes)

---

## Fora de escopo

- Bulk action "marcar todas as pendentes como pagas"
- `paidAt` com hora exata (usa meia-noite UTC)
- Histórico de auditoria de pagamentos
- Status `ANTICIPATED` para adiantamento via antecipação financeira (quitação total) — spec futura
