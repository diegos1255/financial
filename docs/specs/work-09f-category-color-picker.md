# WORK-09F — Color Picker nas Categorias

**Status:** [x] Plano aprovado  [x] Spec aprovada  [x] Implementado

---

## Objetivo

Permitir que o usuário escolha uma cor ao cadastrar ou editar uma categoria de despesa. A cor é exibida no gráfico de donuts do Dashboard, substituindo a paleta fixa atual para as categorias que tiverem cor configurada.

---

## Backend

### 1. `ExpenseCategory.java`

Adicionar campo:

```java
@Column(name = "color", length = 7)
private String color;  // hex, ex: "#dc2626". Nullable.
```

O Hibernate (`ddl-auto=update`) adiciona a coluna automaticamente. Categorias existentes ficam com `color = NULL`.

### 2. `ExpenseCategoryRequest.java`

```java
public record ExpenseCategoryRequest(

    @NotBlank(message = "name é obrigatório")
    @Size(max = 80, message = "name deve ter no máximo 80 caracteres")
    String name,

    @Size(max = 255, message = "description deve ter no máximo 255 caracteres")
    String description,

    @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "color deve ser um hex válido (ex: #dc2626)")
    String color  // opcional; null = sem cor definida
) {}
```

### 3. `ExpenseCategoryResponse.java`

Adicionar `String color` ao record (pode ser `null`).

### 4. `ExpenseCategoryMapper.java`

Sem alteração necessária — MapStruct mapeia `color` automaticamente por nome.

### 5. `ExpenseCategoryService.java` / `update`

Sem lógica especial — `color` é mapeado igual aos outros campos pelo `updateEntityFromRequest`.

---

## Frontend

### 1. Instalar `react-colorful`

```bash
npm install react-colorful
```

Picker leve (~3KB gzip), zero dependências, suporta HexColorPicker out-of-the-box.

### 2. `src/types/category.ts`

```ts
export type Category = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;   // ← novo
  active: boolean;
  createdDate: string;
  updatedDate: string;
};

export type CategoryRequest = {
  name: string;
  description?: string | null;
  color?: string | null;   // ← novo
};
```

### 3. `CategoryFormModal.tsx`

- Estado `color: string` inicializado com `editing?.color ?? '#6366f1'` (indigo como default).
- Seletor de cor: círculo colorido clicável que abre/fecha um popover com `<HexColorPicker>`.
- O popover fecha ao clicar fora (usando `useRef` + `useEffect` com listener `mousedown`).
- `color` incluído no `Payload` e enviado ao `categoryService`.
- Na tela de confirmação (step 2), exibir o círculo da cor escolhida junto ao nome.

```tsx
// Exemplo de seletor:
<div className="flex items-center gap-3">
  <label className="text-sm font-medium text-slate-700">Cor</label>
  <div className="relative">
    <button
      type="button"
      onClick={() => setPickerOpen((v) => !v)}
      className="h-8 w-8 rounded-full border-2 border-slate-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      style={{ backgroundColor: color }}
      aria-label="Escolher cor"
    />
    {pickerOpen && (
      <div ref={pickerRef} className="absolute left-0 top-10 z-50 rounded-xl shadow-xl">
        <HexColorPicker color={color} onChange={setColor} />
      </div>
    )}
  </div>
  <span className="font-mono text-xs text-slate-500">{color}</span>
</div>
```

### 4. `src/types/dashboard.ts`

```ts
export type CategoryExpense = {
  categoryId: string;
  categoryName: string;
  color: string | null;   // ← novo
  total: number;
};
```

> **Nota:** O backend já retorna `color` no `DashboardService` via a query de `expensesByCategory`? Verificar — se não, ajustar a query/DTO.

### 5. `DashboardService` (backend) — `expensesByCategory`

Verificar se a query JPQL já seleciona `color` da categoria. Se não, adicionar ao DTO `CategoryExpense` (Java) e à query.

### 6. `PieChart.tsx`

O componente já aceita `Slice[]` com `{ name, value }`. Estender para aceitar `color` opcional:

```ts
type Slice = {
  name: string;
  value: number;
  color?: string;   // ← novo
};
```

Na renderização:

```tsx
{data.map((entry, i) => (
  <Cell
    key={i}
    fill={entry.color ?? PALETTE[i % PALETTE.length]}
  />
))}
```

Legenda também usa `entry.color ?? PALETTE[i % PALETTE.length]`.

### 7. `DashboardPage.tsx`

Passar `color` no mapeamento para o `PieChart`:

```tsx
data={byCategory.map((c) => ({
  name: c.categoryName,
  value: c.total,
  color: c.color ?? undefined,
}))}
```

---

## Fluxo de dados

```
CategoryFormModal → categoryService.create/update({ color }) 
  → POST/PUT /api/categories → ExpenseCategoryMapper → ExpenseCategory.color salvo no banco

DashboardPage → dashboardService.expensesByCategory()
  → GET /api/dashboard/expenses-by-category → CategoryExpense.color
  → PieChart → Cell.fill = categoria.color ?? PALETTE[i]
```

---

## Validações

| Regra | Onde |
|---|---|
| `color` é opcional (nullable) | Backend e frontend |
| Formato obrigatório se informado: `#RRGGBB` (7 chars, hex) | Bean Validation no request |
| Categorias sem cor usam paleta fixa no gráfico | PieChart fallback |

---

## Arquivos alterados

**Backend:**
- `ExpenseCategory.java`
- `ExpenseCategoryRequest.java`
- `ExpenseCategoryResponse.java`
- Verificar `DashboardRepository.java` / query de categories

**Frontend:**
- `package.json` (+ react-colorful)
- `src/types/category.ts`
- `src/types/dashboard.ts`
- `src/pages/categories/CategoryFormModal.tsx`
- `src/components/ui/PieChart.tsx`
- `src/pages/DashboardPage.tsx`

---

## Fora de escopo

- Paleta de sugestões rápidas (pode vir depois).
- Edição de cor nas despesas ou contas bancárias.
- Exibição da cor na tabela de listagem de categorias (pode vir depois).
