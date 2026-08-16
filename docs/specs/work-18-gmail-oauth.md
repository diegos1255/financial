# WORK-18 — Gmail OAuth setup

## Metadados

- `spec_id`: WORK-18
- `titulo_tecnico`: Integração Gmail — Fase 0: OAuth 2.0 setup + persistência segura de tokens
- `source_product_spec`: `docs/03-gmail-integration-plan.md` (plano-mãe)
- `source_product_spec_version`: 1
- `baseline_branch_or_commit`: `master @ 6580edd`
- `target_branch`: `work-18-gmail-oauth`
- `escopo_sistema`: financial (backend) + financial-front (só página de gate) + Google Cloud (setup manual)
- `última_atualização`: 2026-08-08

## 1. Objective do documento

- Permitir que Diego autorize o sistema `financial` a acessar sua conta Gmail via OAuth 2.0
- Persistir de forma **segura e criptografada** o refresh token no banco
- Prover mecanismo de refresh automático do access token quando expirado
- Adicionar menu "Email" no sidebar (via `data.sql`), levando a uma página de gate ("conectar" ou "desconectar")
- **Não cobre**: leitura/envio de emails (fica pra WORK-19+). Esta spec é só a plumbing de autorização.

## 2. System overview

- **Estado atual**: sistema não conhece Gmail. Sem tokens, sem endpoints Gmail, sem UI.
- **Estado alvo**:
  - Google Cloud Console configurado (manual — passos documentados)
  - Backend com entidade `GmailCredential`, endpoints de auth flow (`/api/gmail/auth-url`, `/api/gmail/callback`, `/api/gmail/status`, `/api/gmail/disconnect`) e service que refresha access token quando necessário
  - Frontend com nova rota `/email` mostrando estado de conexão + botão "Conectar Gmail"
  - Menu "Email" aparece no sidebar
- **Delta técnico**:
  - 1 nova entidade + tabela (`gmail_credentials`)
  - 1 novo service (`GmailAuthService`)
  - 1 novo utilitário (`TokenCipher`)
  - 1 novo controller (`GmailAuthController`)
  - Novos DTOs (`GmailAuthUrlResponse`, `GmailStatusResponse`)
  - Novo dep no `pom.xml`: `google-api-client` + `google-oauth-client` (só o necessário pra token exchange e refresh; API do Gmail em si só entra na WORK-19)
  - Config: `application.yml` ganha bloco `gmail.*`
  - Frontend: rota `/email`, service `gmailService.ts`, tela `GmailConnectPage.tsx` (será substituída pela inbox na WORK-19)
- **Escopo explícito**: OAuth flow completo (authorization code + refresh token) + persistência criptografada
- **Fora de escopo**: chamar Gmail API pra listar emails, enviar, etc. Só a autorização.
- **Restrições obrigatórias**:
  - Refresh token nunca em plain text no DB (AES-GCM)
  - Escopos pedidos alinhados com features futuras (`gmail.modify` + `gmail.send` + `gmail.labels`) — evita re-consent no meio do desenvolvimento
  - CSRF ativo em POST/DELETE
  - Multi-user isolation: cada user tem no máximo 1 conta Gmail conectada

## 3. Architecture design

- **Fluxo OAuth 2.0 (authorization code grant + PKCE opcional)**:
  ```
  1. User clica "Conectar Gmail" no front
  2. Front chama GET /api/gmail/auth-url → recebe URL de autorização do Google
  3. Front redireciona browser pra essa URL
  4. Google mostra tela de consent (Diego autoriza)
  5. Google redireciona de volta pro sistema: GET /api/gmail/callback?code=xxx&state=yyy
  6. Backend troca code por (access_token + refresh_token) via POST na token endpoint do Google
  7. Backend descobre o email autorizado via userinfo endpoint
  8. Backend salva GmailCredential (refresh_token criptografado, access_token, expires_at, email)
  9. Backend redireciona browser pra /email no front
  10. Front vê estado "conectado" e mostra qual email
  ```
- **State parameter**: gerado no backend (nonce criptográfico), guardado em cookie httpOnly de curta duração (5min). Callback valida `state` recebido == state do cookie. Previne CSRF no callback.
- **Refresh flow**: quando qualquer chamada futura à Gmail API (WORK-19+) receber 401 do Google, `GmailAuthService.refreshAccessToken()` faz POST na token endpoint com o refresh_token e atualiza a linha do DB. Retry uma vez a chamada original.
- **Reject flow**: se refresh_token expirou/foi revogado (7 dias em test mode), Google retorna 400 `invalid_grant`. Sistema apaga a linha (força reconnect) e retorna 401 `GMAIL_REAUTH_REQUIRED` pro frontend.
- **Trade-offs**:
  - **Test mode** vs verificação da Google → escolhido test mode (aceita re-autorização a cada 7 dias). Verificação vira feature futura se for necessário.
  - **PKCE** (Proof Key for Code Exchange) → **incluído** mesmo sendo optional pra "web server flow" — hardening barato contra ataques de code interception.
  - **State em cookie** vs sessão em DB → cookie é stateless e simples. TTL 5min limita janela de replay.

## 4. Data design

- **Nova tabela `gmail_credentials`**:

  | Coluna | Tipo | Nullable | Constraints |
  |---|---|---|---|
  | `id` | uuid | NOT NULL | PK, `gen_random_uuid()` |
  | `user_id` | uuid | NOT NULL | FK → `users(id)`, UNIQUE (1 conta por user) |
  | `email_address` | varchar(254) | NOT NULL | email da conta Google autorizada |
  | `refresh_token_encrypted` | text | NOT NULL | AES-GCM: `base64(iv || ciphertext || tag)` |
  | `access_token` | varchar(2048) | NULL | plain (short-lived, ~1h); NULL após criação e antes do primeiro refresh |
  | `expires_at` | timestamptz | NULL | quando o `access_token` expira |
  | `scope` | varchar(500) | NOT NULL | escopos concedidos (space-separated) |
  | `created_date` | timestamptz | NOT NULL | auto |
  | `updated_date` | timestamptz | NOT NULL | auto |

- **UNIQUE constraint** em `user_id` — 1 conta Gmail por user
- **Sem soft-delete**: `DELETE /api/gmail/disconnect` remove a linha e revoga o token no Google (POST em `oauth2.googleapis.com/revoke`)

- **`TokenCipher`**:
  - Algoritmo: AES-256-GCM
  - Chave: derivada de env var `GMAIL_TOKEN_ENCRYPTION_KEY` (obrigatório em runtime; 32 bytes em base64)
  - IV: aleatório 12 bytes por operação
  - Formato armazenado: `base64(IV || ciphertext || auth_tag)`
  - Se `GMAIL_TOKEN_ENCRYPTION_KEY` não estiver definida → aplicação **falha ao subir** (fail-fast)

## 5. Interface design

- **APIs REST**:

  | Método | Path | Auth | Descrição |
  |---|---|---|---|
  | `GET` | `/api/gmail/status` | JWT | retorna `{ connected: boolean, emailAddress?: string }` |
  | `GET` | `/api/gmail/auth-url` | JWT | gera URL de autorização Google + seta cookie `gmail_oauth_state` (5min TTL, httpOnly) |
  | `GET` | `/api/gmail/callback?code=...&state=...` | JWT | recebe redirect do Google, troca code por tokens, salva, redireciona pra `/email` no front |
  | `DELETE` | `/api/gmail/disconnect` | JWT + CSRF | revoga token no Google + apaga row |

- **`GmailStatusResponse`**:
  ```json
  { "connected": true, "emailAddress": "diego@gmail.com" }
  ```
  ou
  ```json
  { "connected": false }
  ```

- **`GmailAuthUrlResponse`**:
  ```json
  { "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..." }
  ```

- **Errors**:
  - `GMAIL_ALREADY_CONNECTED` (409) — tentativa de gerar auth-url quando já tem row
  - `GMAIL_INVALID_STATE` (400) — cookie state != query param state (callback)
  - `GMAIL_TOKEN_EXCHANGE_FAILED` (502) — Google recusou o code
  - `GMAIL_NOT_CONNECTED` (404) — DELETE quando não tem row

- **Escopos OAuth pedidos** (constantes em `GmailScopes.java`):
  ```
  openid email
  https://www.googleapis.com/auth/gmail.modify
  https://www.googleapis.com/auth/gmail.send
  https://www.googleapis.com/auth/gmail.labels
  ```
  (`gmail.modify` já inclui `gmail.readonly` — evita 2 escopos)
  (`gmail.labels` explícito para manipular labels custom na WORK-22)

- **Query params na URL de autorização**:
  ```
  client_id={GMAIL_CLIENT_ID}
  redirect_uri={GMAIL_REDIRECT_URI}
  response_type=code
  scope={scopes acima, space-separated}
  access_type=offline    ← garante refresh_token
  prompt=consent         ← força tela de consent (necessário pra receber refresh_token toda vez)
  state={nonce gerado}
  ```

## 6. Component design

### `CMP-01` GmailCredential (entity)
- Path: `com.financial.gmail.model.GmailCredential`
- Extends `BaseEntity`
- Campos §4
- Anotação `@Table(uniqueConstraints = @UniqueConstraint(columnNames = "user_id"))`

### `CMP-02` GmailCredentialRepository
- `Optional<GmailCredential> findByUserId(UUID userId)`
- `boolean existsByUserId(UUID userId)`
- `void deleteByUserId(UUID userId)`

### `CMP-03` TokenCipher
- Path: `com.financial.gmail.util.TokenCipher`
- Métodos:
  - `String encrypt(String plaintext)` → retorna base64
  - `String decrypt(String base64)` → retorna plaintext
- `@PostConstruct` valida que `GMAIL_TOKEN_ENCRYPTION_KEY` tá presente e tem 32 bytes decoded

### `CMP-04` GmailOAuthClient
- Path: `com.financial.gmail.oauth.GmailOAuthClient`
- Wrappers pra chamadas HTTP:
  - `TokenExchangeResult exchangeCodeForTokens(String code)`
  - `TokenExchangeResult refreshAccessToken(String refreshToken)`
  - `UserInfo fetchUserInfo(String accessToken)` — pega email via `https://openidconnect.googleapis.com/v1/userinfo`
  - `void revokeToken(String refreshToken)`
- Usa `RestClient` (Spring 6.1+) — sem depender do google-api-java-client pesado só pra isso

### `CMP-05` GmailAuthService
- Path: `com.financial.gmail.service.GmailAuthService`
- Métodos:
  - `String buildAuthorizationUrl(String stateNonce)`
  - `void handleCallback(String code, UUID userId)` — orquestra exchange + save
  - `String getValidAccessToken(UUID userId)` — retorna access_token válido (refresha se expirado)
  - `void disconnect(UUID userId)` — revoga no Google + apaga row
  - `Optional<GmailStatusResponse> getStatus(UUID userId)`

### `CMP-06` GmailAuthController
- Path: `com.financial.gmail.controller.GmailAuthController`
- `@RequestMapping("/api/gmail")`
- Endpoints §5
- Cookie helpers (set/get do `gmail_oauth_state`)

### `CMP-07` GmailScopes (constantes)
- Path: `com.financial.gmail.oauth.GmailScopes`
- Listagem de escopos como constantes

### `CMP-08` GmailProperties
- Path: `com.financial.gmail.config.GmailProperties`
- `@ConfigurationProperties(prefix = "gmail")` com fields: `clientId`, `clientSecret`, `redirectUri`, `tokenEncryptionKey`, `authEndpoint`, `tokenEndpoint`, `revokeEndpoint`, `userinfoEndpoint`

### `CMP-09` GmailConnectPage.tsx (frontend)
- Path: `src/pages/gmail/GmailConnectPage.tsx`
- Estados visuais:
  - **Loading**: fetch inicial de `/api/gmail/status`
  - **Não conectado**: card com botão "Conectar Gmail" (clique → fetch `/api/gmail/auth-url` → `window.location.href = data.authUrl`)
  - **Conectado**: card mostrando email + botão "Desconectar" (com confirm modal)
- Também trata redirect de volta do callback: se query `?connected=1` na URL, mostra toast "Gmail conectado com sucesso"

### `CMP-10` gmailService.ts (frontend)
- Path: `src/services/gmailService.ts`
- Métodos:
  - `getStatus()`
  - `getAuthUrl()`
  - `disconnect()`

## 7. UI and interaction design

- **Nova rota**: `/email` no `App.tsx`
- **Menu**: nova entry `label='Email'`, `route='/email'`, `icon='mail'`, `sort_order=8` no `data.sql`
- **Ícone**: adicionar `mail` no `ICON_MAP` da `Sidebar.tsx` (lucide `Mail`)
- **Estados da GmailConnectPage**:
  - Loading: skeleton
  - Não conectado: `<div>` centralizado com título "Conecte sua conta Gmail" + descrição breve + botão azul "Conectar Gmail" (ícone Mail)
  - Conectado: card mostrando "Conectado como: diego@gmail.com" + botão "Desconectar" (variant ghost) + placeholder "Inbox chegará na próxima fase"
- **Acessibilidade**: botão principal com foco automático, `aria-label` no ícone

## 8. Runtime and operations

- **Novas env vars**:
  - `GMAIL_CLIENT_ID` (obrigatório em runtime)
  - `GMAIL_CLIENT_SECRET` (obrigatório)
  - `GMAIL_REDIRECT_URI` (default: `http://localhost/api/gmail/callback` em dev)
  - `GMAIL_TOKEN_ENCRYPTION_KEY` (obrigatório, 32 bytes base64)
- **`.env.example`** ganha essas 4 vars (com placeholders e comentário explicando como obter)
- **`docker-compose.yml` + `docker-compose.dist.yml`**: passam as 4 vars pro backend
- **`application.yml`**:
  ```yaml
  gmail:
    client-id: ${GMAIL_CLIENT_ID}
    client-secret: ${GMAIL_CLIENT_SECRET}
    redirect-uri: ${GMAIL_REDIRECT_URI:http://localhost/api/gmail/callback}
    token-encryption-key: ${GMAIL_TOKEN_ENCRYPTION_KEY}
    auth-endpoint: https://accounts.google.com/o/oauth2/v2/auth
    token-endpoint: https://oauth2.googleapis.com/token
    revoke-endpoint: https://oauth2.googleapis.com/revoke
    userinfo-endpoint: https://openidconnect.googleapis.com/v1/userinfo
  ```
- **Novo dep no `pom.xml`**:
  ```xml
  <dependency>
    <groupId>com.google.api-client</groupId>
    <artifactId>google-api-client</artifactId>
    <version>2.7.0</version>
  </dependency>
  ```
  (só para type-safety de token responses; se preferir RestClient puro, dispensa)
- **Setup manual (documentado em `docs/gmail-google-cloud-setup.md`)**:
  1. Criar projeto no Google Cloud Console
  2. Habilitar Gmail API
  3. Configurar OAuth consent screen (external, test mode, adicionar Diego como test user)
  4. Criar credencial OAuth 2.0 (application type: Web application)
  5. Copiar Client ID + Secret
  6. Adicionar `http://localhost/api/gmail/callback` como Authorized redirect URI
  7. Gerar `GMAIL_TOKEN_ENCRYPTION_KEY` (`openssl rand -base64 32`)
- **Rollout**: como qualquer outra WORK, `docker-compose build backend frontend + up -d`. Tabela criada por `ddl-auto=update`.

## 9. Security, privacy and compliance

- **Refresh token = credencial permanente**: precisa ser tratado como senha
- **Criptografia em rest**: AES-GCM 256, chave separada em env var
- **Nunca logar**: refresh token nunca vai pro log. Access token também não (mesmo sendo curto)
- **CSRF**: DELETE `/api/gmail/disconnect` protegido; callback é GET e usa `state` param
- **State validation**: sem match state → 400
- **Redirect URI whitelist**: apenas o valor exato configurado no Google (`http://localhost/api/gmail/callback`)
- **Escopo minimalista**: `gmail.modify + gmail.send + gmail.labels` — não pede `mail.google.com` (super amplo)

## 10. Requirement mapping

### `REQ-18-01` Fluxo de conexão OAuth
- Aceite: user clica "Conectar Gmail", autoriza no Google, volta pra `/email?connected=1` e vê "Conectado como diego@gmail.com"
- Testes: manual + integração via curl (simulando o callback com code fake e verificando falha)

### `REQ-18-02` Persistência segura de refresh token
- Aceite: `SELECT refresh_token_encrypted FROM gmail_credentials` retorna base64 opaco; descriptografia via `TokenCipher.decrypt` retorna o refresh_token original
- Testes: unit em `TokenCipher` (encrypt/decrypt roundtrip; tampering → falha)

### `REQ-18-03` Refresh automático de access token
- Aceite: `GmailAuthService.getValidAccessToken` retorna access_token válido; se expirado, chama Google e atualiza DB antes de retornar
- Testes: unit no service (mockar Google endpoints, forçar expiração)

### `REQ-18-04` Disconnect revoga token
- Aceite: `DELETE /api/gmail/disconnect` chama Google revoke + apaga row; próximo `/status` retorna `connected: false`
- Testes: integração no controller

### `REQ-18-05` Menu Email no sidebar
- Aceite: após deploy, item "Email" (ícone Mail) aparece no sidebar entre Investimentos e PJ… espera, sort_order = 8 vai DEPOIS de PJ (7). Confirmar. Sidebar renderiza correto
- Testes: manual no browser

## 11. Implementation plan input

### `WORK-18A` Backend base (entity + cipher + client)
- Arquivos:
  - `com/financial/gmail/model/GmailCredential.java`
  - `com/financial/gmail/repository/GmailCredentialRepository.java`
  - `com/financial/gmail/util/TokenCipher.java`
  - `com/financial/gmail/config/GmailProperties.java`
  - `com/financial/gmail/oauth/GmailScopes.java`
  - `com/financial/gmail/oauth/GmailOAuthClient.java`
- Pré-req: nenhum
- Validar: unit test do TokenCipher (roundtrip)

### `WORK-18B` Service + Controller
- Arquivos:
  - `com/financial/gmail/service/GmailAuthService.java`
  - `com/financial/gmail/controller/GmailAuthController.java`
  - `com/financial/gmail/dto/GmailStatusResponse.java`
  - `com/financial/gmail/dto/GmailAuthUrlResponse.java`
- Pré-req: WORK-18A
- Validar: `curl GET /api/gmail/status` retorna `{connected: false}` inicialmente

### `WORK-18C` Config + menu + docs
- Arquivos:
  - `application.yml` (bloco `gmail`)
  - `.env.example` + `docker-compose.yml` + `docker-compose.dist.yml` (4 novas vars)
  - `data.sql` (menu Email)
  - `financial-front/src/components/layout/Sidebar.tsx` (mapear icon `mail`)
  - `docs/gmail-google-cloud-setup.md` (novo — passo-a-passo Google Cloud)
- Pré-req: WORK-18B
- Validar: Diego segue o doc, cria projeto no Google, coloca as vars no `.env`, sistema sobe

### `WORK-18D` Frontend gate
- Arquivos:
  - `financial-front/src/pages/gmail/GmailConnectPage.tsx`
  - `financial-front/src/services/gmailService.ts`
  - `financial-front/src/App.tsx` (nova rota `/email`)
- Pré-req: WORK-18C
- Validar: clicar botão "Conectar Gmail" abre tela do Google, autorizar, volta pra `/email?connected=1`, ver estado conectado

## 12. Test plan

- **Unit**: `TokenCipher` (encrypt/decrypt/tamper detection), `GmailAuthService.getValidAccessToken` (com mock do Google)
- **Integration**: `GmailAuthController` (endpoints básicos com MockMvc)
- **Manual (Diego)**:
  - [ ] Setup Google Cloud seguindo `docs/gmail-google-cloud-setup.md`
  - [ ] Colocar `GMAIL_*` vars no `.env` local
  - [ ] Subir sistema, ir em `/email`
  - [ ] Clicar "Conectar Gmail"
  - [ ] Autorizar no Google
  - [ ] Voltar pro sistema, ver "Conectado como diego@gmail.com"
  - [ ] Reiniciar backend, `/email` ainda mostra "conectado" (token persistido)
  - [ ] Desconectar → volta pra "não conectado"
  - [ ] Verificar no DB que `refresh_token_encrypted` é base64 opaco (não legível como token)
- **Regressões**: nada quebrado (feature isolada); menu sidebar mantém funcionamento

## 13. Open items

- **Bloqueios**: precisa de conta Google, projeto no GCP e Diego seguindo o setup manual antes de testar E2E
- **Riscos**:
  - **Refresh token expira em 7 dias em test mode** — Fase 0 apenas registra; Fase 1+ trata avisando no UI
  - **Verificação da Google no futuro** — se um dia sair do test mode, precisa formulário + política de privacidade + revisão (semanas). Não é problema desta fase.
- **Decisões pendentes**:
  - `google-api-client` (dep leve, ~500KB) vs `RestClient` puro (zero dep nova mas mais código). Vou de RestClient puro pra manter dep footprint enxuto — não gosto de adicionar SDK inteiro só pra token exchange.
- **Assunções**:
  - Sistema roda em `http://localhost` (redirect_uri). Se um dia ir pra domínio real, ajustar no `.env` + no Google Cloud Console.
