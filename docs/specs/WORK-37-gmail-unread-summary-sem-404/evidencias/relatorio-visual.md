# Teste visual — WORK-37 unread-summary sem 404 para quem não conectou o Gmail

- `data`: 2026-10-07
- `app`: http://localhost (backend e frontend reconstruídos com o código da branch antes do teste)
- `usuário de teste`: sdd-teste-work-37-e0560f (criado e apagado nesta execução; sem Gmail conectado)
- `resultado`: ✅ todos passaram

## Resultado por critério

| Critério | Resultado | Esperado | Visto na tela | Print |
|---|---|---|---|---|
| WORK-37 / C-01 (a) rede | ✅ passou | nenhum 404 em `/api/gmail/unread-summary`; ≥ 2 chamadas, todas 200 | 3 chamadas (20:30:20.282, 20:30:20.350 e 20:30:50.353, esta do polling 30s depois), todas 200, com corpo `{"connected":false,"totalUnread":0,...}` | [antes](WORK-37-C-01-antes.png), [depois](WORK-37-C-01-depois.png) |
| WORK-37 / C-01 (b) console | ✅ passou | nenhum erro (404 ou outro) sobre unread-summary depois de 35s | nenhuma mensagem de console sobre unread-summary (36s de espera) | idem |
| WORK-37 / C-01 (c) Dashboard | ✅ passou | Dashboard carrega normalmente, sem badge de não lidos | "Boa tarde, Teste", cards em R$ 0,00, item "Email" do menu sem badge | [depois](WORK-37-C-01-depois.png) |

## Falhas e não executados

Nenhum.

## Erros de console e HTTP

Nenhum deles tem relação com este ajuste:
- `[ERROR] 401 em /api/users/me`: aparece em /login, antes do login, quando o app checa a sessão.
- `[WARNING]` do Recharts: `The width(-1) and height(-1) of chart should be greater than 0`, ao montar o Dashboard.
- Na carga inicial, `unread-summary` é chamado 2 vezes com 68 ms de diferença. Não quebra o critério, mas é uma chamada a mais.

## Testes de tela gravados (fluxos principais)

Nenhum: o plano do ajuste não marca fluxo principal (P-14), e o projeto não tem `@playwright/test` configurado.
