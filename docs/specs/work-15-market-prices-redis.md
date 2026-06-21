# Spec WORK-15 — Cotações de mercado com Redis cache + Brapi

> **Status:** aprovada para implementação em 2026-06-12.

---

## Metadados
- **spec_id:** `WORK-15`
- **titulo_tecnico:** Cotações de mercado em tempo real com cache Redis (TTL 24h) via Brapi.dev
- **baseline:** pós-WORK-14 (sistema completo com segurança)
- **target_branch:** `feature/work-15-market-prices`
- **escopo_sistema:** `financial` (back) + `financial-front` (front) + `docker-compose`
- **última_atualização:** 2026-06-12

---

## 1. Objective

Integrar cotações de mercado em tempo real para os investimentos do usuário, usando a API pública **Brapi.dev** com cache em **Redis** (TTL 24h). Eliminar o campo `unit_price` do formulário de cadastro de investimento — o preço passa a vir do mercado, não ser digitado manualmente. A tabela de investimentos e o dashboard passarão a exibir o valor de mercado atual de cada posição.

**Fora de escopo:** ativos internacionais, criptomoedas, rastreamento de custo médio de compra (fica para fase futura), histórico de preços.

---

## 2. System overview

**Estado atual:**
- `Investment` tem `unit_price` (BigDecimal) preenchido manualmente pelo usuário.
- Tabela de investimentos exibe "Preço unit." e "Total" calculados com esse valor manual.
- Nenhuma integração com dados externos de mercado.

**Estado alvo:**
- Redis como cache de cotações, TTL de 24h por ticker.
- `MarketPriceService` consulta Brapi.dev quando o cache está frio; usa o cache quando está quente.
- Formulário de investimento: remove campo `unit_price` (campo permanece no banco como nullable para compatibilidade retroativa, mas não é mais usado).
- Tabela de investimentos: colunas "Preço atual (mercado)" e "Valor de mercado" substituem as anteriores.
- Cotação ausente (ticker inválido, Brapi offline): exibe "—" sem quebrar.

**Restrições:**
- Brapi.dev plano gratuito: ~1.000 req/mês. Com TTL 24h e poucos tickers, o limite nunca será atingido.
- Redis via Docker, sem autenticação (dev local). Em prod futura, configurar senha via env var.

---

## 3. Architecture design

```
Frontend
   │ GET /api/investments/portfolio
   ▼
InvestmentController
   │
   ▼
InvestmentService.getPortfolio(userId)
   │  para cada ticker ativo do usuário:
   ▼
MarketPriceService.getPrice(ticker)
   │
   ├─► Redis HIT (TTL < 24h) → retorna cached price
   │
   └─► Redis MISS → GET https://brapi.dev/api/quote/{ticker}
                        │
                        ▼
                    atualiza Redis (TTL 24h)
                    retorna price
```

**Cache key:** `market_price:{ticker}` (ex: `market_price:PETR4`)
**Cache value:** JSON com `{ price, changePercent, fetchedAt }`

---

## 4. Data design

### Redis (novo)
- Chave: `market_price:{TICKER}` (String)
- Valor: JSON serializado de `MarketPriceCache { BigDecimal price, BigDecimal changePercent, OffsetDateTime fetchedAt }`
- TTL: 24 horas (configurável via env `MARKET_PRICE_TTL_HOURS`, default 24)

### Entidade `Investment` (ajuste)
- Campo `unit_price` (já existente): passa a ser **nullable**, semântica muda para "preço médio de compra" (opcional, para tracking futuro de custo).
- Sem nova coluna. O Hibernate com `ddl-auto=update` não dropa colunas, então não há risco de perda de dados.
- Campos `quantity` e `ticker` continuam obrigatórios.

### Nenhuma tabela nova no banco.

---

## 5. Interface design

### Novo endpoint
| Método | Path | Auth | Descrição |
|---|---|---|---|
| `GET` | `/api/investments/portfolio` | JWT | Retorna posições do usuário enriquecidas com cotação atual |

**Response `InvestmentPortfolioResponse`:**
```json
{
  "items": [
    {
      "id": "uuid",
      "ticker": "PETR4",
      "quantity": 100,
      "currentPrice": 38.50,
      "changePercent": 1.25,
      "marketValue": 3850.00,
      "priceUnavailable": false
    }
  ],
  "totalMarketValue": 3850.00,
  "fetchedAt": "2026-06-12T22:00:00-03:00"
}
```

Se `priceUnavailable = true`: `currentPrice`, `changePercent` e `marketValue` são `null`.

### Endpoints existentes alterados
- `POST /api/investments` — campo `unitPrice` deixa de ser obrigatório no request (passa a ser opcional/ignorado). Backend salva como `null` se não enviado.
- `PUT /api/investments/{id}` — mesmo ajuste.

### Brapi.dev (externo)
- `GET https://brapi.dev/api/quote/{ticker}?token={BRAPI_TOKEN}`
- Resposta relevante: `results[0].regularMarketPrice`, `results[0].regularMarketChangePercent`
- Token opcional no plano gratuito (1.000 req/mês sem token; com token gratuito, mais).

---

## 6. Component design

### Backend

**`docker-compose.yml`** — novo serviço:
```yaml
redis:
  image: redis:7-alpine
  restart: unless-stopped
  ports:
    - "6379:6379"
```

**`pom.xml`** — nova dependência:
```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

**`RedisConfig.java`** — configura `RedisTemplate<String, String>` com serialização JSON e TTL default.

**`BrapiClient.java`** — `@Component` que usa `RestClient` (Spring 6) para `GET https://brapi.dev/api/quote/{ticker}`. Retorna `Optional<BrapiQuote>`. Em caso de erro HTTP ou timeout (3s), retorna `Optional.empty()`.

**`MarketPriceService.java`** — lógica principal:
```
getPrice(ticker):
  1. key = "market_price:" + ticker.toUpperCase()
  2. cached = redis.get(key)
  3. if cached != null → return desserializar(cached)
  4. quote = brapiClient.fetch(ticker)
  5. if quote.isEmpty() → return MarketPrice.unavailable()
  6. price = MarketPrice(quote.price, quote.changePercent, now)
  7. redis.set(key, serializar(price), TTL=24h)
  8. return price
```

**`InvestmentService.getPortfolio(userId)`** — carrega investimentos ativos do usuário, chama `marketPriceService.getPrice(ticker)` para cada ticker único, monta `InvestmentPortfolioResponse`.

**`InvestmentRequest`** — campo `unitPrice` deixa de ser `@NotNull`.

**`Investment` entity** — `unit_price` vira nullable (remover `nullable = false` da anotação `@Column`).

### Frontend

**`investmentService.ts`** — novo método `getPortfolio()` → `GET /api/investments/portfolio`.

**`InvestmentsPage.tsx`** — ao carregar, chama `getPortfolio()` além de `list()`. Substitui colunas "Preço unit." e "Total" por "Preço atual" e "Valor de mercado". Badge de variação (+1,25% em verde / -0,50% em vermelho). Se `priceUnavailable`, exibe "—".

**`InvestmentFormModal.tsx`** — remove campo `unit_price` do formulário.

**`types/investment.ts`** — adicionar `InvestmentPortfolioItem` e `InvestmentPortfolioResponse`.

---

## 7. Runtime / ops

**Novas env vars:**
| Var | Default | Descrição |
|---|---|---|
| `REDIS_HOST` | `localhost` | Host do Redis |
| `REDIS_PORT` | `6379` | Porta do Redis |
| `BRAPI_TOKEN` | `` (vazio) | Token Brapi.dev (opcional no plano free) |
| `BRAPI_BASE_URL` | `https://brapi.dev` | Base URL da Brapi |
| `BRAPI_TIMEOUT_SECONDS` | `3` | Timeout de chamada à Brapi |
| `MARKET_PRICE_TTL_HOURS` | `24` | TTL do cache Redis em horas |

**`.env` local:** adicionar `REDIS_HOST=localhost`, `REDIS_PORT=6379`.

**`docker-compose`:** o serviço `backend` depende de `redis: service_started`.

---

## 8. Security

- Token Brapi fica em env var, nunca em código.
- Redis sem senha em dev (rede interna Docker). Em prod futura: `REDIS_PASSWORD` + `requirepass` no Redis.
- Cotações são públicas — nenhum dado sensível do usuário vai para a Brapi.

---

## 9. Open items

- **O-31:** Exibir custo médio de compra vs preço de mercado (% de ganho/perda) — **deixar para fase futura**. Precisaria que o usuário informasse o preço médio de compra.
- **O-32:** Refresh manual de cotação ("forçar atualização") — **deixar para fase futura**.
- **O-33:** Tickers inválidos — quando o usuário cadastra um ticker que não existe na Brapi, mostrar um aviso na tabela mas não bloquear o cadastro.

---

## 10. Implementation plan

| Sub-task | Objetivo |
|---|---|
| 15.1 | Docker: adicionar serviço `redis` ao `docker-compose.yml` + env vars |
| 15.2 | Backend: `pom.xml` + `RedisConfig` + `application.yml` |
| 15.3 | Backend: `BrapiClient` com RestClient + timeout + tratamento de erro |
| 15.4 | Backend: `MarketPriceService` com lógica de cache |
| 15.5 | Backend: `InvestmentService.getPortfolio()` + `InvestmentPortfolioResponse` |
| 15.6 | Backend: `InvestmentController` — novo endpoint `/portfolio` + ajuste em request |
| 15.7 | Backend: `Investment` entity — `unit_price` nullable |
| 15.8 | Frontend: types + service + `InvestmentsPage` atualizado |
| 15.9 | Frontend: `InvestmentFormModal` — remover campo `unit_price` |
| 15.10 | Smoke test: cadastrar PETR4 + MXRF11, verificar cotações no Redis via `redis-cli` |

---

## Critério de "pronto"
```
[ ] Redis rodando via docker-compose, backend conecta
[ ] BrapiClient retorna cotação real de PETR4
[ ] Cache Redis populado após primeira consulta (TTL 24h)
[ ] Segunda consulta usa cache (sem chamar Brapi)
[ ] Tabela de investimentos exibe preço atual e valor de mercado
[ ] Ticker inválido exibe "—" sem erro
[ ] Formulário sem campo unit_price
[ ] Diego aprova
```
