# Spec WORK-11 — Signup público + upload de foto + MinIO

> Fase 11. Cadastro público com upload para storage S3-compatível.

---

## Metadados
- **spec_id:** `WORK-11`
- **titulo_tecnico:** Container MinIO no docker-compose + PhotoStorageService (AWS S3 SDK) + AuthController.signup + UserController.uploadPhoto + PasswordPolicyValidator + SignupPage + ImageUploader
- **source_product_spec:** `PLAN-01`
- **baseline:** pós-WORK-10
- **target_branch:** `feature/work-11-signup-upload`
- **escopo_sistema:** `financial`, `security`, `financial-front`, `docker-compose.yml`
- **última_atualização:** 2026-05-31

---

## 1. Objective
Adicionar signup público com upload de foto opcional. Foto vai para MinIO. Pós-signup, auto-login. Avatar aparece no menu.

**Fora:** rate limiting (WORK-12), captcha, e-mail de confirmação.

---

## 2. System overview
- **Atual:** WORK-10 entregou stack containerizada. Login funcional, sem signup.
- **Alvo:** signup público + upload + MinIO no compose. Tela de cadastro acessível via "Cadastre-se" na tela de login.

---

## 3. Architecture
Adiciona `minio` ao docker-compose. `financial` ganha cliente AWS S3 SDK apontando para MinIO. Bucket `avatars` criado por sidecar `minio-init` (alpine + `mc` cli).

```
financial-front ────multipart────▶ financial ────S3 SDK────▶ MinIO
                                       │
                                       └────JDBC────▶ postgres (users.photo_url)
```

---

## 4. Data design
`users.photo_url` passa a guardar caminho do objeto no MinIO (ex: `users/{user_id}/avatar.jpg`) ou URL pública construída via env var `MINIO_PUBLIC_URL`. Definir em sub-WORK-11.1.

---

## 5. Interface design

| Método | Path | Auth | Comportamento |
|---|---|---|---|
| POST | `/api/auth/signup` | nenhuma | `multipart/form-data`: campo `data` (JSON `{name, login, password}`) + campo `photo` (file, opcional). 201 + `{token, user}`. |
| POST | `/api/users/me/photo` | JWT | `multipart/form-data` com `photo`. Substitui foto. 200 + `{photoUrl}`. |

**Validações server-side:**
- `password`: regex `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$`.
- `login`: único (409 `LOGIN_ALREADY_EXISTS`).
- `photo`: MIME `image/jpeg` ou `image/png`, tamanho ≤ 2MB, magic bytes validados (Apache Tika ou check manual).
- Senha fraca → 422 `WEAK_PASSWORD` com `fieldErrors` listando regras violadas.

---

## 6. Component design

### Na lib `security`:
- Adicionar `/api/auth/signup` à whitelist do `SecurityFilterChain`.
- `PasswordPolicyValidator` (Jakarta `ConstraintValidator`) — anotação `@StrongPassword`.

### No `financial`:
- `PhotoStorageService` — usa `software.amazon.awssdk:s3` configurado contra MinIO endpoint. Métodos: `upload(userId, MultipartFile)`, `delete(userId)`, `getPublicUrl(userId)`.
- `S3Config` (`@Configuration`) — bean `S3Client` lendo `${MINIO_ENDPOINT}`, `${MINIO_ROOT_USER}`, `${MINIO_ROOT_PASSWORD}`, `${MINIO_BUCKET}`.
- `AuthController.signup(@Valid SignupRequest, @RequestPart(required=false) MultipartFile photo)`.
- `UserController.uploadPhoto(@RequestPart MultipartFile photo)`.
- `SignupRequest` (record) — com `@StrongPassword`.
- `PhotoTooLargeException`, `InvalidPhotoTypeException`, `WeakPasswordException`, `LoginAlreadyExistsException` (handlers no `ApiErrorHandler`).

### No `financial-front`:
- `SignupPage` — form `name/login/password/confirmPassword` + `<ImageUploader />`.
- `ImageUploader` — drag-drop ou click, preview, validação client-side (tipo + tamanho) com mensagens.
- `authService.signup(formData)` — envia multipart.
- Topbar do `ProtectedLayout` mostra avatar (`<img src={user.photoUrl} />`) ou inicial do nome se ausente.

### No `docker-compose.yml`:
- Serviço `minio` (imagem `quay.io/minio/minio:latest`) com volume + portas 9000/9001.
- Serviço `minio-init` (alpine com `mc` instalado) que cria bucket `avatars` no startup e sai.

---

## 7. UI

**SignupPage:** estilo similar ao LoginPage; form com:
- name (required)
- login (required, min 4 chars)
- password (required, hint visual mostra regras com check verde quando atendidas)
- confirmPassword (deve igualar)
- photo (uploader opcional, mostra preview redondo 128x128)
- Botão "Cadastrar" (disabled enquanto inválido)
- Link "Já tenho conta — Entrar" volta para `/login`.

**ImageUploader:** área 200x200 com dashed border, mensagem "Clique ou arraste a foto", preview ao selecionar, botão X pra remover.

---

## 8. Runtime/ops
- Novas env vars:
  ```env
  MINIO_ROOT_USER=admin
  MINIO_ROOT_PASSWORD=changeme-secure-key-min-8
  MINIO_BUCKET=avatars
  MINIO_ENDPOINT=http://minio:9000
  MINIO_PUBLIC_URL=http://localhost:9000  # ou via nginx proxy em prod
  ```
- Console MinIO em `http://localhost:9001`.

---

## 9. Security
- Bucket `avatars` configurado como **público read** (URLs diretas funcionam) OU **privado com presigned URLs** geradas pelo back. Recomendo **presigned URLs** (mais seguro). Validar com Diego (O-33).
- Magic bytes validados (não confiar em MIME do client).
- Upload limita 2MB no Spring (`spring.servlet.multipart.max-file-size=2MB`).
- Senha forte server-side (validação no front é só UX).

---

## 10. Requirement mapping
- **REQ-12** (Signup + upload) ✅ — implementação total.
- **D-04** (Foto via upload) ✅.
- **D-10** (Senha forte) ✅.
- **D-11** (Limites upload) ✅.

---

## 11. Implementation plan input

| Sub-WORK | Objetivo |
|---|---|
| WORK-11.1 | Container MinIO + minio-init no docker-compose |
| WORK-11.2 | `PhotoStorageService` + `S3Config` no financial |
| WORK-11.3 | `PasswordPolicyValidator` + `@StrongPassword` na lib security |
| WORK-11.4 | `AuthController.signup` + DTOs + exception handlers |
| WORK-11.5 | `UserController.uploadPhoto` + endpoint update photo |
| WORK-11.6 | Whitelist `/api/auth/signup` no SecurityConfig |
| WORK-11.7 | `SignupPage` + `ImageUploader` no front |
| WORK-11.8 | Avatar na Topbar |
| WORK-11.9 | Smoke E2E (signup com/sem foto, validações de erro) |

---

## 12. Test plan
- **Unit:** `PasswordPolicyValidatorTest` (10 cenários de senha boa/má), `PhotoStorageServiceTest` (mock S3Client), `AuthControllerTest` para signup.
- **Integração:** Testcontainers com MinIO (image oficial) — fluxo signup com upload, verificar objeto no bucket.
- **Manual:** cada cenário de validação na UI.

---

## 13. Open items
- **O-33:** Bucket público vs privado com presigned? Recomendo **privado + presigned** (mais seguro). URL gerada em cada GET do user.
- **O-34:** Redimensionar foto no back antes de salvar (ex: max 512x512)? Recomendo **sim** — economiza storage e padroniza UI. Usar Thumbnailator.
- **O-35:** Captcha no signup? **Não nesta fase** — rate limit (WORK-12) cobre o essencial.

---

## Critério de "pronto"
```
[ ] docker-compose up sobe MinIO + cria bucket avatars
[ ] POST /api/auth/signup sem foto → 201 + token, user.photoUrl null
[ ] POST /api/auth/signup com foto válida → 201 + token, foto no MinIO
[ ] POST com senha fraca → 422 WEAK_PASSWORD com regras violadas
[ ] POST com login existente → 409 LOGIN_ALREADY_EXISTS
[ ] POST com foto > 2MB → 422 PHOTO_TOO_LARGE
[ ] POST com foto .gif renomeada → 422 INVALID_PHOTO_TYPE (magic bytes)
[ ] Front: tela signup com validação visual da senha
[ ] Pós-signup: auto-login + avatar no menu
[ ] Diego aprova explicitamente
```
