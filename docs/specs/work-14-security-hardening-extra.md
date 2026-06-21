# Spec WORK-14 — Security hardening extra (auth cookie em produção + XSS defenses)

> **Status:** aprovada para implementação em 2026-06-12. Decisões dos open items registradas abaixo.
>
> **Complemento de [[work-12-hardening]]:** WORK-12 cobre rate limiting + security headers básicos + logs. WORK-14 vai além, especificamente em auth + XSS + ambiente produtivo.

---

## Metadados
- **spec_id:** `WORK-14`
- **titulo_tecnico:** Hardening adicional de segurança — HTTPS+Secure cookie, CSRF token explícito, refresh token rotation, CSP, defesas XSS, idle timeout
- **source_product_spec:** `PLAN-01`
- **baseline:** pós-WORK-08 (cookie auth httpOnly entregue) + pós-WORK-12 (rate limit + headers)
- **target_branch:** `feature/work-14-security-hardening-extra` (a criar quando puxada)
- **escopo_sistema:** `financial` (back) + `security` (lib) + `financial-front` (front)
- **última_atualização:** 2026-06-06 (criação do stub)

---

## 1. Objective
Levar a autenticação cookie-based da WORK-08 para **production-grade** em ambiente real (domínios distintos, HTTPS, ataques cross-origin reais). Reduzir superfície de ataque XSS no front. Mitigar cenário de acesso físico ao computador.

**Fora:** WAF, DDoS protection (geralmente em camada de infra/CDN), 2FA (precisa nova spec dedicada).

---

## 2. System overview

**Estado pós-WORK-08:**
- Cookie `auth_token` httpOnly + SameSite=Lax + CORS allowedOrigins explícitos. Em dev local (mesmo host, portas diferentes), funciona bem.

**Limitações conhecidas e atacáveis em produção (lista vinda da revisão da WORK-08, 2026-06-06):**

1. **XSS executando requests no contexto do site.** Atacante injeta JS via input não-escapado → JS faz `fetch('/api/expenses', {credentials: 'include'})` → browser anexa cookie automaticamente. Atacante NÃO exfiltra o token (httpOnly mata isso), mas executa ações em nome do user enquanto a sessão dura.
2. **Acesso físico ao computador.** Atacante na sua máquina logado opera o sistema. Defesa é controle físico + idle timeout do app.
3. **Produção em domínios diferentes** (ex: `app.financial.com` ↔ `api.financial.com`). SameSite=Lax bloqueia POST/PUT/DELETE cross-site. Precisa `SameSite=None; Secure` (HTTPS obrigatório) + CSRF token explícito.
4. **HTTP em dev sem `Secure` flag.** Cookie viaja em clear-text — qualquer MITM lê o JWT.
5. **Token longo (8h).** Roubo de token = janela de exploração de até 8h.
6. **Sem CSP headers.** Browser não bloqueia scripts inline ou de origens estranhas — fator multiplicador de risco XSS.

---

## 3. Architecture

**Back (`security` lib + `financial`):**
- Modificar `SecurityConfig` para CSRF habilitado em prod (perfil Spring): `CookieCsrfTokenRepository.withHttpOnlyFalse()` + `CsrfTokenRequestAttributeHandler`.
- Cookie auth com flag `Secure` baseado em config (env var `JWT_COOKIE_SECURE=true` em prod).
- Cookie `SameSite=None` em prod (junto com Secure), `Lax` em dev.
- CSP headers no `SecurityConfig.headers()` — política restritiva.
- Endpoint `POST /api/auth/refresh` que troca refresh token (em cookie httpOnly separado) por novo access token (cookie curto, 15min).

**Front (`financial-front`):**
- Axios já com `withCredentials=true` (feito na WORK-08). Adicionar header `X-XSRF-TOKEN` lido do cookie `XSRF-TOKEN` (Axios faz automático, só precisa do cookie existir).
- Hook `useIdleLogout` — detecta inatividade (`mousemove`/`keydown` listeners), dispara logout após N minutos.
- Auditoria de `dangerouslySetInnerHTML` (zero uso) e de renderização de dados user-controlled (devem sempre passar por `{value}` do JSX, nunca via `innerHTML`).

---

## 4. Data design
- Refresh token: persistido em tabela `refresh_tokens` (`id`, `user_id`, `token_hash` BCrypt, `expires_at`, `revoked` boolean, `created_date`, `last_used_at`). Permite revogar uma sessão específica sem matar todas.
- Sem mudança em outras tabelas.

---

## 5. Interface design

**Novos endpoints:**
| Método | Path | Comportamento |
|---|---|---|
| POST | `/api/auth/refresh` | Lê cookie `refresh_token`. Se válido + não-revogado, emite novo `auth_token` (15min) e rotaciona o `refresh_token` (revoga o antigo, emite novo). 401 se inválido. |
| POST | `/api/auth/logout` | Já existe (WORK-08). Vai passar a também revogar o refresh token. |
| GET | `/api/auth/sessions` | (Opcional) Lista sessões ativas do user. |
| DELETE | `/api/auth/sessions/{id}` | (Opcional) Revoga sessão específica. |

**Mudanças em endpoints existentes:**
- `POST /api/auth/login` — seta **2 cookies**: `auth_token` (15min) e `refresh_token` (8h-30d, conforme política).

**Front:**
- Interceptor Axios: em 401 com code `TOKEN_EXPIRED`, tenta `POST /api/auth/refresh` antes de redirecionar pra `/session-expired`. Se refresh funciona, retry da request original.

---

## 6. Component design

**Back:**
- `RefreshTokenService` — gera, valida, rotaciona, revoga refresh tokens (com BCrypt no DB pra não deixar token em claro).
- `RefreshTokenRepository` (JpaRepository) — CRUD com `findByTokenHashAndRevokedFalse`.
- `CsrfTokenFilter` — automatizado pelo Spring Security; só precisa configurar.
- `CspHeaderFilter` ou usar `.headers(h -> h.contentSecurityPolicy(...))` no SecurityFilterChain.
- `IdleTimeoutProperties` — env vars: `IDLE_TIMEOUT_MINUTES` (default 15).

**Front:**
- `useIdleLogout(minutes)` — hook que mata sessão após inatividade.
- Service worker (opcional) — pode interceptar requests pra controle adicional.
- `RefreshTokenInterceptor` no Axios — promise dedup para não disparar N refresh paralelos.

---

## 7. UI
- Modal "Sua sessão vai expirar em 1 minuto" antes do idle logout — botão "Continuar logado" cancela o timer.
- Tela de "Sessões ativas" (se O-29 ativado).

---

## 8. Runtime/ops

**Novas env vars:**
- `JWT_COOKIE_SECURE` — `true` em prod (com HTTPS), `false` em dev.
- `JWT_COOKIE_SAMESITE` — `Strict` ou `None` em prod, `Lax` em dev.
- `JWT_ACCESS_TOKEN_MINUTES` — `15` em prod, mantém atual em dev.
- `JWT_REFRESH_TOKEN_DAYS` — `30` ou conforme política.
- `IDLE_TIMEOUT_MINUTES` — `15` default.
- `CSP_POLICY` — override da política CSP via env (ou hardcoded em config).

**Deploy:**
- HTTPS obrigatório em prod (TLS no nginx/reverse proxy à frente). Cookie `Secure` só funciona em HTTPS.
- `HSTS` header (já no [[work-12-hardening]]) garante que browser sempre usa HTTPS após primeira visita.

---

## 9. Security

**Threat model atualizado:**
| Ataque | Defesa adicionada |
|---|---|
| XSS exfiltração de token | Já mitigado em WORK-08 (httpOnly) |
| XSS executando ações com cookie | CSP bloqueia scripts maliciosos antes deles rodarem |
| CSRF cross-domain em prod | CSRF token (CookieCsrfTokenRepository) + verificação Origin |
| Token roubado válido por 8h | Access token 15min + refresh rotation; janela cai pra ~15min |
| Acesso físico continua logado | Idle timeout auto-logout |
| MITM em HTTP dev | Secure flag + HTTPS-only em prod |
| Sessão zumbi após troca de senha | Revogação de todos refresh tokens do user ao trocar senha |

---

## 10. Requirement mapping
- Não há REQ-XX formal para esses itens — são de qualidade/conformidade. Aderência a OWASP cheat sheets (Session Management, Cookie Theft, CSRF Prevention, XSS Prevention).

---

## 11. Implementation plan input

| Sub-WORK | Objetivo |
|---|---|
| WORK-14.1 | Refresh token: model + repo + service + endpoint `/refresh` + ajustes em `/login` |
| WORK-14.2 | Mudanças no cookie de prod: env vars `Secure`, `SameSite`, perfil Spring `prod` vs `dev` |
| WORK-14.3 | CSRF token explícito: SecurityConfig com `CookieCsrfTokenRepository.withHttpOnlyFalse` + ignoringMatchers em `/login` e `/refresh` |
| WORK-14.4 | CSP header restritivo no SecurityConfig (`default-src 'self'`, `script-src 'self'`, etc) |
| WORK-14.5 | Front: interceptor Axios com refresh-on-401 + promise dedup |
| WORK-14.6 | Front: hook `useIdleLogout` + modal "vai expirar em 1min" |
| WORK-14.7 | (Opcional) Endpoints `GET/DELETE /api/auth/sessions` + tela de sessões |
| WORK-14.8 | Auditoria XSS: zero `dangerouslySetInnerHTML`, escape de tudo user-controlled |
| WORK-14.9 | Postman + smoke E2E: login → 15min depois /me dá 401 TOKEN_EXPIRED → /refresh → /me OK; logout revoga refresh; CSRF token enviado e validado |

---

## 12. Test plan
- **Unit:** `RefreshTokenServiceTest` (gera, valida, rotaciona, revoga; soma com revogação em cascata no logout).
- **Integração:** Testcontainers — fluxo login → refresh → logout; tentar refresh com token revogado → 401.
- **Manual:** Browser DevTools: cookies `auth_token` + `refresh_token` ambos httpOnly; `XSRF-TOKEN` visível pra JS; após 15min de uso, /me dá 401 e refresh transparente; após 30min ocioso, logout automático.

---

## 13. Open items — DECIDIDOS em 2026-06-12

- **O-27 ✅ SLIDING** — Refresh token renova a cada uso (sliding), expira 30 dias após o último uso.
- **O-28 ✅ ENFORCEMENT DIRETO** — CSP aplicado em enforcement desde o início. Front novo e limpo, sem scripts inline, não há motivo pra `report-only`. Padrão de sistemas financeiros (bancos, fintechs).
- **O-29 ✅ FASE FUTURA** — Endpoints `GET/DELETE /api/auth/sessions` e tela de sessões ativas ficam para uma fase posterior, caso o sistema seja publicado na internet. Quando chegar, implementar: lista de sessões abertas com dispositivo/IP/data, botão de revogar sessão individual remotamente.
- **O-30 ✅ MODAL DE AVISO** — Exibir modal "Sua sessão vai expirar em 1 minuto" antes do idle logout. Botão "Continuar logado" cancela o timer.

---

## Critério de "pronto"
```
[x] Spec aprovada pelo Diego (2026-06-12)
[ ] Refresh token funcional + endpoint /refresh + rotação sliding (30 dias)
[ ] Access token de 15min (env-configurável)
[ ] Cookie Secure + SameSite ajustáveis por env
[ ] CSRF token explícito habilitado em prod
[ ] CSP header em enforcement direto
[ ] Front trata refresh transparente (sem o user perceber)
[ ] Idle timeout funcional + modal de aviso 1min
[ ] Zero dangerouslySetInnerHTML no codebase
[ ] Postman valida fluxo completo
[ ] Diego aprova implementação
```
