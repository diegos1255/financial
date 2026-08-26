# Plano-mãe: Chat RAG do Controle Financeiro

## Contexto

Diego quer um **chat agêntico embutido no sistema** que responda dúvidas de uso ("como cadastro salário?", "como funciona a fatia de investimentos no dashboard?") baseado no que já está descrito nas próprias **specs** do projeto. Objetivo educacional/pessoal: praticar RAG com stack real dentro de um projeto SDD ativo.

**Não é** um assistente genérico. Ele só sabe sobre o **próprio sistema** — regras, campos, caminhos de menu, decisões arquiteturais que estão documentadas.

## Escopo firmado (não re-perguntar)

- **Corpus**: `docs/specs/*.md` + `docs/02-development-plan.md` + `docs/01-database-modeling.md` (+ opcionalmente `CLAUDE.md`)
- **LLM**: Google **Gemini 1.5 Flash** (free tier: 1500 req/dia)
- **Embeddings**: Google **text-embedding-004** (768 dimensões, free)
- **Vector DB**: Postgres + extensão **pgvector** (já temos Postgres, só habilitar)
- **Cliente**: **widget de chat** no frontend (bolinha bottom-right, drawer que sobe)
- **Sem streaming** nesta versão (request-response simples)
- **Sem persistência de histórico** (conversa vive na sessão do browser)
- **Reindexação**: endpoint admin manual (`POST /api/chat/rag/reindex`), sem watcher automático
- **Fora de escopo**: portal externo standalone (dá pra fazer em 30min depois se quiser), streaming SSE, feedback thumbs up/down, indexar Gmail, indexar dados operacionais (despesas/salários — isso seria SQL-agent, não RAG)

## Stack consolidada

| Camada | Tecnologia | Versão/Nota |
|---|---|---|
| Vector DB | pgvector | Extensão do Postgres 16 |
| Embeddings | Google `text-embedding-004` | 768 dim, chamada HTTP direta |
| LLM | Google `gemini-1.5-flash` | Free tier 1500 rpd |
| Cliente HTTP | Spring `RestClient` | Mesma abordagem do Gmail (`GmailApiClient`) |
| Chunking | Custom por seção Markdown | Fallback fixo 800 tokens |
| Widget | React + Tailwind | Padrão do resto do sistema |

**Sem SDK Java oficial do Gemini** — vamos usar HTTP direto via `RestClient`. Motivo: o SDK oficial do Google GenAI é pesado (traz `google-cloud-*` inteiro) e a superfície que precisamos é minúscula (2 endpoints). Menos dep, menos surpresa.

## Fases

| WORK | Nome | Escopo | Estimativa |
|---|---|---|---|
| **WORK-26** | RAG setup | pgvector, tabela `chat_document_chunks`, config Gemini, DTOs, sem endpoint ainda | ~3h |
| **WORK-27** | RAG ingestion | Chunker, EmbeddingClient (Gemini), IngestionService, endpoint admin reindex | ~4h |
| **WORK-28** | RAG query | RetrievalService, GeminiChatClient, prompt engineering, endpoint `/api/chat/query` | ~4h |
| **WORK-29** | Chat widget | Bolinha bottom-right, drawer, input, mostra sources com link pra spec | ~4h |

Total: ~15h de trabalho útil dividido em 4 entregas revisáveis. Cada WORK termina com Diego validando manualmente antes de fechar.

## Fluxo de branch

Segue a mesma regra do Gmail ([[feedback-branch-and-merge]]):
- **1 branch única** `rag-integration` pra toda a feature
- Commit por WORK (push depois de cada WORK finalizada)
- **Merge no master só quando toda a feature (WORK-29) estiver pronta E Diego aprovar explicitamente**

## Custo estimado

- **Ingestion**: ~1 embedding call por chunk. ~30 specs × 5 chunks médios = 150 chamadas. Free tier folga.
- **Query**: 1 embed + 1 chat = 2 chamadas por pergunta.
- **Free tier Gemini**: 15 req/min, 1500 req/dia. Uso pessoal fica muito longe do limite.
- **$0/mês** enquanto ficar no free tier.

## Novas envs

```
GEMINI_API_KEY=              # criar em https://aistudio.google.com/apikey
CHAT_RAG_TOP_K=5             # default; quantos chunks trazer no retrieval
CHAT_RAG_MIN_SCORE=0.55      # default; ignora chunks com similaridade abaixo
```

Sem `GEMINI_API_KEY` o chat fica desabilitado (graceful degradation, mesmo padrão do ElevenLabs no WORK-20).

## Segurança e limites

- **Rate limit específico** pro endpoint `/api/chat/query`: 20 req/hora por user (evita burn acidental do free tier em loop de frontend com bug)
- **`/api/chat/rag/reindex`** só pra user logado (protegido pelo JWT — no futuro pode virar admin-only mas por enquanto Diego é o único user)
- **Input sanitization**: pergunta max 500 chars, sem CR/LF/null (mesma sanitização da busca do Gmail)
- **Não vaza sistemas externos**: prompt do LLM instrui a responder SÓ sobre o Controle Financeiro; se pergunta for off-topic, responde "só sei sobre o Controle Financeiro"

## Referências pra as specs

- Template: `04-development-spec-system-design-template.md`
- Padrões do projeto: `CLAUDE.md`
- Exemplo de spec de referência bem escrita: `docs/specs/work-18-gmail-oauth.md`
