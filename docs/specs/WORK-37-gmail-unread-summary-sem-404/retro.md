# Retrospectiva — WORK-37 unread-summary sem 404 para quem não conectou o Gmail

- `data`: 2026-10-07
- `tipo`: ajuste (primeira WORK do projeto com o plugin sdd-diego)
- `merge`: 97ff3b7

## Fatos

- O plano foi aprovado de primeira. Na aprovação, o Diego acrescentou o teste visual (Dashboard, 35s, sem 404 no console e na rede). Não houve spec reaberta.
- A validação teve 3 rodadas:
  - O revisor de testes apontou 1 bloqueante (faltava teste de controller com status e JSON) e 2 achados importantes. Os testes passaram de 3 para 12, e 2 mutações (404 no controller, cache lido antes da credencial) foram pegas.
  - O revisor de correção deu 2 sugestões, que foram aplicadas. Uma terceira, de defeito anterior à WORK, foi para o backlog.
  - Um pipe (`testes-banais | tail`) engoliu o exit 1 do detector e deixou registrar `codigo-validado`. O achado era falso positivo (`andExpect` não era reconhecido). O plugin foi corrigido (0.7.3) e a validação refeita sem pipe.
  - Depois do commit do backend, o hook acusou mudança de código sem mudança real (bug da impressão digital). Isso forçou a terceira rodada.
- O teste visual passou. O `app subir` não reconstruiu as imagens (reconstrução feita na mão). Os prints não mostravam a correção, que só aparece na rede e no console; isso ficou descrito no relatório.
- Os portões COMMIT e FINALIZAR precisaram ser reenviados. O "pode comitar" veio depois de "nao nao" no início da mensagem, e o "pode finalizar" chegou antes de o portão estar aberto.
- 3 itens fora do escopo foram para o backlog do plano-mestre.

## Respostas do Diego

1. **O que funcionou bem:**
   - O plano leu o código antes de propor e evitou o bug do front que dependia do 404.
   - O teste vermelho veio antes do código.
   - Os revisores pegaram o teste de controller que faltava (3 → 12 testes, com mutação).
   - O teste visual abriu o Chrome e apagou o usuário de teste no fim.
   - Quando a aprovação não foi registrada, parei e expliquei, sem contornar o hook.
   - Os itens fora do escopo foram para o backlog em vez de virar código.
2. **O que atrapalhou:**
   - Reenviar "pode comitar" e "pode finalizar" (a regra do início da mensagem e o portão ainda não aberto).
   - O `app subir` sem rebuild.
   - O bug da impressão digital, que forçou a terceira rodada de validação.
   - O pipe que escondeu o detector.
3. **Regras e plugin:**
   - Constituição do financial: nenhuma regra nova.
   - Plugin: 5 melhorias (versão 0.7.4), registradas em `.sdd/sugestoes-plugin.md`.

## Ações combinadas

| # | Ação | Onde | Responsável |
|---|---|---|---|
| 1 | "pode commitar" e "pode finalizar" valem como aprovação antecipada quando a WORK já está na etapa certa | plugin sdd-diego 0.7.4 | Diego |
| 2 | O hook avisa claramente quando achou a palavra de aprovação fora do início da mensagem | plugin sdd-diego 0.7.4 | Diego |
| 3 | A impressão digital não muda quando arquivo novo é commitado | plugin sdd-diego 0.7.4 | Diego |
| 4 | O teste visual salva o log de rede e de console como evidência, além dos prints | plugin sdd-diego 0.7.4 | Diego |
| 5 | O `.sdd/state.json` entra no commit de fechamento | plugin sdd-diego 0.7.4 | Diego |
| — | Rodar comandos `sdd.mjs` sem pipe e conferir o exit code de cada um | prática do Claude (memória) | Claude |
