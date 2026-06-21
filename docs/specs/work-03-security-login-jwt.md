# Spec WORK-03 — Security (login + JWT + proteção total)

> Fase 3. Lib `security` ganha conteúdo; `financial` ganha login.

---

## Metadados
- **spec_id:** `WORK-03`
- **titulo_tecnico:** Autenticação JWT na lib `security` + endpoint `/api/auth/login` no `financial` + whitelist explícita + payload de erro padronizado
- **source_product_spec:** `PLAN-01`
- **baseline:** pós-WORK-02
- **target_branch:** `feature/work-03-security-login`
- **escopo_sistema:** `security` (lib) + `financial` (consumidor)
- **última_atualização:** 2026-05-31

---

## 1. Objective
Implementar autenticação completa via JWT na lib `security` (auto-configurável), expor `POST /api/auth/login` no `financial`, bloquear todos os outros endpoints sem token, padronizar erros com payload `{code, message, fieldErrors}`.

**Fora:** signup (WORK-11), rate limit (WORK-12), CRUDs de domínio (WORK-04), tela de login (WORK-08).

---

## 2. System overview
- **Atual:** entidade `User` existe no banco (WORK-02); nenhum endpoint protegido; sem autenticação.
- **Alvo:** lib `security` provê AutoConfiguration que ativa `SecurityFilterChain`, `JwtAuthenticationFilter`, `PasswordEncoder` (BCrypt strength 10). `financial` declara `UserDetailsServiceImpl` consumindo `UserRepository` e expõe `AuthController.login`.
- **Restrições:** secret e expiração lidos do `${JWT_SECRET}` / `${JWT_EXPIRATION_HOURS}` no `.env`. HS256.

---

## 3. Architecture
- Lib `security` torna-se Spring Boot Starter mínimo: classes `@Configuration` listadas em `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports`.
- `financial` ganha `AuthController` em `controller/` e `UserDetailsServiceImpl` em `service/`.
- Header request: `Authorization: Bearer <jwt>`.

---

## 4. Data design
- Sem mudança no schema.
- Seed manual de 1 user para teste: `INSERT INTO users (id, name, login, password, active) VALUES (gen_random_uuid(), 'Diego', 'diego', '$2a$10$...bcrypt...', true);`. Hash gerado via `BCryptPasswordEncoder.encode("senha-de-teste")` (Diego roda via JShell ou um test util).

---

## 5. Interface design

| Método | Path | Auth | Request | Response 200 | Erros |
|---|---|---|---|---|---|
| POST | `/api/auth/login` | nenhuma | `{login: string, password: string}` | `{token: string, user: {id, name, login, photoUrl, active}}` | 400 `INVALID_PAYLOAD`, 401 `BAD_CREDENTIALS`, 401 `USER_INACTIVE` |
| GET | `/api/users/me` | JWT | — | `{id, name, login, photoUrl, active}` (UserResponse) | 401 `UNAUTHORIZED`, 401 `TOKEN_EXPIRED` |

**Payload de erro padronizado (definido aqui, usado em todas as fases):**
```json
{
  "timestamp": "2026-05-31T14:23:00Z",
  "status": 401,
  "code": "BAD_CREDENTIALS",
  "message": "Login ou senha inválidos",
  "fieldErrors": []
}
```

**Whitelist explícita no `SecurityFilterChain`:**
```java
.authorizeHttpRequests(auth -> auth
    .requestMatchers("/api/auth/login", "/api/health").permitAll()
    .anyRequest().authenticated()
)
```

> Signup será adicionado à whitelist na WORK-11.

---

## 6. Component design

### Na lib `security`:
- `JwtProperties` — `@ConfigurationProperties("jwt")`, lê `secret` e `expirationHours`.
- `JwtProvider` — `generate(UserDetails)`, `parse(String token) → Claims`, `isValid(String token)`.
- `JwtAuthenticationFilter extends OncePerRequestFilter` — extrai header, parse, popula `SecurityContext`. Em falha (`ExpiredJwtException`, `MalformedJwtException`), seta atributo na request indicando o motivo; o `ApiErrorHandler` do `financial` traduz para `TOKEN_EXPIRED` vs `UNAUTHORIZED`.
- `SecurityConfig` — bean `SecurityFilterChain`: csrf disabled, stateless, whitelist, filtro JWT antes do `UsernamePasswordAuthenticationFilter`.
- `PasswordEncoderConfig` — bean `BCryptPasswordEncoder(10)`.
- `UserDetailsContract` — interface marker (vazia) que o consumidor implementa via `UserDetailsService`. Mantém a lib desacoplada do domínio.
- `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` — lista as 3 `@Configuration`.

### No `financial`:
- **Adicionar dependência** da lib `security` no `pom.xml` (foi removida em WORK-01; volta agora junto com a config):
  ```xml
  <dependency>
    <groupId>com.financial.security</groupId>
    <artifactId>security</artifactId>
    <version>0.0.1-SNAPSHOT</version>
  </dependency>
  ```
- Atualizar README: ressuscitar o passo "Instalar a lib security no .m2 local antes do build".
- `UserRepository extends JpaRepository<User, UUID>` — método `findByLoginAndActiveTrue(String login)`.
- `UserDetailsServiceImpl implements UserDetailsService` — converte `User` para `org.springframework.security.core.userdetails.User`.
- `AuthController` — `POST /api/auth/login`.
- `UserController` — `GET /api/users/me` (retorna `UserResponse` do user autenticado; reusa `UserRepository` e `UserResponse`).
- `LoginRequest` (DTO record) — `{login, password}` com `@NotBlank`.
- `LoginResponse` (DTO record) — `{token, user (UserResponse)}`.
- `UserResponse` (DTO record) — campos seguros do User.
- `ApiErrorHandler` — `@RestControllerAdvice` traduzindo `BadCredentialsException`, `DisabledException`, `ExpiredJwtException`, `MethodArgumentNotValidException`, `Exception` (fallback 500).

---

## 7. UI
N/A (tela login vem na WORK-08).

---

## 8. Runtime/ops
- Novas env vars no `.env.example`:
  ```env
  JWT_SECRET=changeme-min-32-chars-strongly-random-string
  JWT_EXPIRATION_HOURS=8
  ```
- `application.yml`:
  ```yaml
  jwt:
    secret: ${JWT_SECRET}
    expiration-hours: ${JWT_EXPIRATION_HOURS:8}
  ```
- Logs: WARN ao receber JWT inválido.

---

## 9. Security
- Senha hasheada com BCrypt strength 10.
- JWT HS256, secret obrigatoriamente ≥ 32 bytes (JwtProperties valida no startup com `@PostConstruct`).
- Stateless (sem session cookie).
- Whitelist explícita; default = autenticado.
- `User.password` com `@JsonIgnore`.

---

## 10. Requirement mapping
- **REQ-01** (Login) — implementação total.
- **D-12** (Proteção total) — base implementada; signup será adicionado em WORK-11.

---

## 11. Implementation plan input

| Sub-WORK | Objetivo |
|---|---|
| WORK-03.1 | `JwtProperties` + bean validation no startup |
| WORK-03.2 | `JwtProvider` (generate, parse, validate) |
| WORK-03.3 | `JwtAuthenticationFilter` |
| WORK-03.4 | `SecurityConfig` + `PasswordEncoderConfig` |
| WORK-03.5 | `META-INF/spring/...AutoConfiguration.imports` |
| WORK-03.6 | Build/install lib security no `.m2`; adicionar dep no financial pom |
| WORK-03.7 | `UserRepository` + `UserDetailsServiceImpl` no financial |
| WORK-03.8 | `AuthController` + DTOs (`LoginRequest`, `LoginResponse`, `UserResponse`) |
| WORK-03.9 | `UserController.me` |
| WORK-03.10 | `ApiErrorHandler` global + `ApiError` DTO |
| WORK-03.11 | Seed manual de user para teste; smoke tests (login, /me, 401, expired) |

---

## 12. Test plan
- **Unit:** `JwtProviderTest` (gera, parse, valida expirado e malformado); `AuthControllerTest` (`@WebMvcTest` com `MockMvc`).
- **Integração:** `@SpringBootTest` + Testcontainers — fluxo completo login → token → request com token → request sem token → request com token expirado.
- **Manual:** Postman collection com 4 cenários (valid, bad creds, inactive user, no token).

---

## 13. Open items (resolvidos em 2026-06-03)
- **O-09 ✅ NÃO** — refresh token fora do escopo (confirma D-08).
- **O-10 ✅ NÃO** — sem endpoint `/logout`. Front descarta token; multi-user isolation virá dos services filtrando por `user_id` (WORK-04+).
- **O-11 ✅ String simples** — `LoginResponse = {token, user: UserResponse}`.
- **Aditivo aprovado em 2026-06-03:** `GET /api/users/me` incluído no escopo desta fase (UserController, reusa `UserResponse`).

---

## Critério de "pronto"
```
[ ] Lib security compila e gera JAR com AutoConfiguration
[ ] financial importa lib security e sobe sem erro
[ ] POST /api/auth/login com user seed válido → 200 + JWT
[ ] POST com login inválido → 401 BAD_CREDENTIALS
[ ] POST com user inativo → 401 USER_INACTIVE
[ ] GET /api/health continua público (200 sem token)
[ ] GET qualquer outro path → 401 UNAUTHORIZED
[ ] Token expirado/manipulado → 401 TOKEN_EXPIRED
[ ] Testes unit + integração passam
[ ] Diego aprova explicitamente
```
