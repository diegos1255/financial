# Spec WORK-12 — Hardening (rate limiting + security headers + logs)

> Fase 12 (última). Proteção contra abuso de chamadas e reforço de segurança.

---

## Metadados
- **spec_id:** `WORK-12`
- **titulo_tecnico:** Rate limiting com Bucket4j (limites distintos para auth vs demais) + security headers extras + SuspiciousActivityLogger
- **source_product_spec:** `PLAN-01`
- **baseline:** pós-WORK-11
- **target_branch:** `feature/work-12-hardening`
- **escopo_sistema:** `security` (lib), `financial`, `docker-compose`
- **última_atualização:** 2026-05-31

---

## 1. Objective
Bloquear bots/scripts que tentam abusar dos endpoints — limites distintos por categoria de rota. Reforçar headers de segurança HTTP. Logar tentativas suspeitas para auditoria mínima.

**Fora:** WAF (Cloudflare/AWS WAF), DDoS protection real (precisa infra de borda), SIEM. MVP educacional.

---

## 2. System overview
- **Atual:** WORK-11 entregou sistema completo funcional. Endpoints sem proteção contra abuso.
- **Alvo:** rate limit em todas as rotas, mais agressivo nos endpoints de auth. Headers de segurança extras. Logs estruturados de eventos suspeitos.

---

## 3. Architecture
Filtro `RateLimitFilter` na lib `security`, posicionado **antes** do `JwtAuthenticationFilter`. Bucket4j com armazenamento em memória (suficiente para MVP single-instance; em prod multi-instance seria Redis).

```
Request
   │
   ▼
RateLimitFilter (Bucket4j) ─── 429 se exceder
   │
   ▼
JwtAuthenticationFilter
   │
   ▼
Controller
```

---

## 4. Data design
Sem mudança de schema. Buckets em memória, chaveados por IP + endpoint-category.

---

## 5. Interface design

**Novo código de resposta:**
| Código | Quando | Header |
|---|---|---|
| 429 | Rate limit excedido | `Retry-After: <segundos>` |

Payload:
```json
{
  "timestamp":"...",
  "status":429,
  "code":"TOO_MANY_REQUESTS",
  "message":"Limite de requisições excedido. Tente novamente em N segundos.",
  "fieldErrors":[]
}
```

**Limites (configuráveis via env):**
| Categoria | Path pattern | Limite default | Refill |
|---|---|---|---|
| Auth (login + signup) | `/api/auth/login`, `/api/auth/signup` | **5 req/min/IP** | 5 tokens/min |
| Geral autenticado | demais `/api/**` | **100 req/min/IP** | 100 tokens/min |

**Headers de segurança extras** (no `SecurityConfig`):
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS — só efetivo via HTTPS, mas inocuo via HTTP)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`
- `X-Content-Type-Options: nosniff` (já default Spring Security)
- `X-Frame-Options: DENY` (já default)
- Content-Security-Policy básica para o front (entra no nginx.conf).

---

## 6. Component design

### Na lib `security`:
- `RateLimitProperties` — `@ConfigurationProperties("security.rate-limit")`, lê limites configuráveis.
- `RateLimitFilter extends OncePerRequestFilter` — usa Bucket4j (`io.github.bucket4j:bucket4j-core`).
  - Resolve categoria (auth ou general) pelo path.
  - Recupera/cria bucket por IP+categoria.
  - Se bucket vazio: responde 429 + `Retry-After`.
  - Se bucket tem token: consome e segue cadeia.
- `SuspiciousActivityLogger` (`@Component`) — métodos:
  - `logRateLimitHit(ip, path)`
  - `logFailedLogin(ip, login)`
  - `logInvalidJwt(ip, reason)`
  - `logDuplicateSignup(ip, login)`
  - Tudo em WARN com formato estruturado JSON (Logback `LogstashEncoder` ou pattern manual).
- Atualizar `SecurityConfig` para adicionar headers extras e ordem dos filtros.

### Pom adicional:
```xml
<dependency>
  <groupId>com.bucket4j</groupId>
  <artifactId>bucket4j-core</artifactId>
  <version>8.10.1</version>
</dependency>
```

### Nginx (front):
- Adicionar `Content-Security-Policy: default-src 'self'; img-src 'self' http://localhost:9000 data:; ...` no `nginx.conf`.

---

## 7. UI
Front trata 429 mostrando toast amigável: "Muitas tentativas. Aguarde N segundos e tente novamente."

---

## 8. Runtime/ops
Novas env vars:
```env
SECURITY_RATE_LIMIT_AUTH_REQUESTS=5
SECURITY_RATE_LIMIT_AUTH_DURATION_SECONDS=60
SECURITY_RATE_LIMIT_GENERAL_REQUESTS=100
SECURITY_RATE_LIMIT_GENERAL_DURATION_SECONDS=60
```

---

## 9. Security
- Rate limit é uma camada — não substitui WAF/CDN em prod, mas barra scripts simples.
- HSTS só funciona via HTTPS; em prod o reverse proxy (nginx/CDN) deve terminar TLS.
- Logs WARN devem ser monitorados — sem alertas reais nesta versão (educacional), mas Diego pode olhar `docker logs financial` para auditoria manual.

---

## 10. Requirement mapping
- **D-13** (Rate limit) ✅ — implementação total.

---

## 11. Implementation plan input

| Sub-WORK | Objetivo |
|---|---|
| WORK-12.1 | Adicionar Bucket4j ao pom da lib security |
| WORK-12.2 | `RateLimitProperties` + `RateLimitFilter` |
| WORK-12.3 | Integrar filtro no SecurityFilterChain (antes do JWT filter) |
| WORK-12.4 | `SuspiciousActivityLogger` + injetar nos pontos certos (failed login, invalid JWT, signup duplicate) |
| WORK-12.5 | Adicionar headers HSTS/Referrer/Permissions ao SecurityConfig |
| WORK-12.6 | CSP no nginx.conf do front |
| WORK-12.7 | Front: interceptor 429 → toast amigável |
| WORK-12.8 | Validação: script de stress test + inspeção de logs |

---

## 12. Test plan
- **Unit:** `RateLimitFilterTest` — simula múltiplos requests sequenciais.
- **Integração:** Testcontainers + chamadas paralelas via WebTestClient.
- **Manual:** script bash/PowerShell:
  ```powershell
  1..10 | ForEach-Object { curl -X POST http://localhost/api/auth/login -d '{"login":"x","password":"y"}' -H 'Content-Type: application/json' }
  ```
  Últimas chamadas devem retornar 429.

---

## 13. Open items
- **O-36:** Persistência do bucket (Redis) para multi-instance? **Não nesta versão** — single-instance Docker Compose. Documentar como TODO.
- **O-37:** Rate limit por usuário logado (não só IP)? Recomendo IP+user combinado para autenticados. Implementar como segundo critério.
- **O-38:** Endpoint admin para zerar bucket de um IP específico? Não nesta versão.

---

## Critério de "pronto"
```
[ ] Bucket4j configurado e ativo
[ ] 10 POSTs em /api/auth/login em 5s → 5 retornam 429 com Retry-After
[ ] 200 GETs em /api/categories em 1min → 100 retornam 429
[ ] DevTools mostra headers HSTS, Referrer-Policy, Permissions-Policy
[ ] Logs WARN aparecem para failed login / rate limit / JWT inválido
[ ] Front: 429 mostra toast amigável
[ ] Diego aprova explicitamente
```
