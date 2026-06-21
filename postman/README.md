# Postman — Financial Backend

Coleção consolidada do backend MVP. Cobre todos os 22 endpoints REST.

## Arquivos

- `financial.postman_collection.json` — Collection com 9 pastas (Auth, Users, Categorias, Contas Bancárias, Investimentos, Salários, Despesas, Menus, Dashboards).
- `financial-local.postman_environment.json` — Environment local com `{{baseUrl}}`, `{{token}}` e variáveis de id (categoryId, bankAccountId, etc).

## Como importar no Postman

1. Abre o Postman desktop.
2. Botão **Import** (canto superior esquerdo).
3. Arrasta os dois arquivos `.json` desta pasta — ele importa collection + environment juntos.
4. No canto superior direito, **seleciona o environment "Financial — Local"** no dropdown.
5. Pronto.

## Como usar (fluxo típico)

1. Sobe o backend: `cd D:\workspace\financial && .\mvnw.cmd spring-boot:run`.
2. **Roda o `Auth > POST Login (diego)` primeiro.** O Test script salva `{{token}}` automaticamente no environment.
3. As outras requests já vão usar `Authorization: Bearer {{token}}` herdado da collection (configurado no auth global da collection).
4. POSTs também salvam o id do objeto criado no environment (ex: `POST Categorias > create` salva `{{categoryId}}`). Aí o `GET by id` e `PUT/DELETE` funcionam direto, sem você ter que copiar UUID manualmente.

## Testando isolamento multi-user

Tem um `POST Login (bia)` no folder Auth. Roda ele pra alternar pra Bia (login=`bia`, senha=`Bia#2026`). O `{{token}}` é sobrescrito. A partir daí, todas as requests rodam como Bia — útil pra confirmar que ela não vê dados do Diego (e vice-versa).

## Filtros úteis (query params disabled por default)

No `GET Despesas`, os filtros vêm desabilitados. Pra ativar, na aba **Params** marca o checkbox do filtro que quer usar:

- `?year=2026&month=7` — FIXED ativas no mês + INSTALLMENT com parcela no mês
- `?status=ACTIVE` ou `CANCELLED`
- `?categoryId=<uuid>` / `?bankAccountId=<uuid>`

Mesma lógica nos `GET Salários`.

## Códigos de erro padronizados

Todas as respostas de erro têm o formato:
```json
{
  "timestamp": "2026-06-06T...",
  "status": 4xx,
  "code": "CODE_AQUI",
  "message": "Mensagem em PT-BR",
  "fieldErrors": []
}
```

Códigos usados:
- `BAD_CREDENTIALS` (401) — login/senha errados
- `UNAUTHORIZED` (401) — sem token
- `TOKEN_EXPIRED` (401) — token expirado
- `NOT_FOUND` (404) — item não existe OU pertence a outro user
- `INVALID_PAYLOAD` (400) — Jakarta Validation falhou; preenche `fieldErrors[]`
- `CONFLICT` (409) — nome de categoria/ticker duplicado
- `DUPLICATE_SALARY` (409) — competência (year/month) já tem salário
- `INVALID_EXPENSE_TYPE` (422) — INSTALLMENT sem installmentsCount, ou FIXED com installmentsCount
- `EXPENSE_CANCELLATION` (422) — tentar cancelar expense já CANCELLED
- `INTERNAL_ERROR` (500) — erro não tratado
