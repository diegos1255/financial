# Sugestões para o plugin sdd-diego

Melhorias encontradas no uso do plugin neste projeto. Cada uma deve virar uma WORK no repositório `sdd-diego`.

| Data | WORK | Sugestão | Motivo |
|---|---|---|---|
| 2026-10-07 | WORK-37 | Aceitar "pode commitar" e "pode finalizar" como aprovação antecipada quando a WORK já está na etapa certa (0.7.4) | O "pode finalizar" veio junto do "pode commitar", antes de o portão FINALIZAR estar aberto, e não foi registrado. O Diego precisou reenviar. |
| 2026-10-07 | WORK-37 | O hook deve dizer claramente quando achou a palavra de aprovação fora do início da mensagem (0.7.4) | "nao nao, ta perfeito assim... pode comitar" não registrou o COMMIT, sem nenhum aviso. Só se percebeu pelo status. |
| 2026-10-07 | WORK-37 | Corrigir a impressão digital (`lib/fingerprint.mjs`) para não mudar quando arquivo novo é commitado (0.7.4) | Os arquivos não rastreados entram no hash pelo conteúdo bruto, e os commitados pelo `git diff`. Commitar os testes novos mudou o hash sem mudar o código, e o hook bloqueou os commits seguintes. Foi preciso uma terceira rodada de validação. |
| 2026-10-07 | WORK-37 | O teste visual deve salvar o log de rede e de console como evidência, não só prints (0.7.4) | A correção só aparecia na rede e no console. Os 2 prints mostravam só o Dashboard, e o Diego não conseguiu ver a prova. |
| 2026-10-07 | WORK-37 | Incluir o `.sdd/state.json` no commit de fechamento (0.7.4) | O hook bloqueia comandos que citam o arquivo, e ele ficou modificado fora do git depois do merge. |
| 2026-10-07 | WORK-37 | `app subir` deve reconstruir as imagens (ou avisar) quando o app já está no ar | Ele só conferiu que a URL respondia. O teste visual rodaria contra o código antigo. Citado pelo Diego no item 2 da retro, mas fora da lista da 0.7.4. |
