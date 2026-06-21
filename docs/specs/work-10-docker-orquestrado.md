# Spec WORK-10 — Docker orquestrado (back + front + postgres)

> Fase 10. Dockerização do sistema.

---

## Metadados
- **spec_id:** `WORK-10`
- **titulo_tecnico:** Dockerfile multi-stage do `financial` (com lib `security` embutida) + Dockerfile do `financial-front` (Vite build + Nginx) + `docker-compose.yml` orquestrando os 3 serviços com healthchecks e `env_file`
- **source_product_spec:** `PLAN-01`
- **baseline:** pós-WORK-09
- **target_branch:** `feature/work-10-docker`
- **escopo_sistema:** raiz do projeto (orquestração), `financial`, `financial-front`
- **última_atualização:** 2026-05-31

---

## 1. Objective
`docker-compose up -d --build` na raiz sobe os 3 serviços. Sistema acessível em `http://localhost/` (nginx do front com proxy reverso para `/api/*` → back).

**Fora:** MinIO (vem WORK-11), CI/CD, deploy em cloud, HTTPS real.

---

## 2. System overview
- **Atual:** WORK-09 entregou tudo funcionando local (back via mvnw, front via npm dev, postgres via docker-compose).
- **Alvo:** stack 100% containerizada localmente.

---

## 3. Architecture

```
                    ┌─────────────────────────────┐
       :80          │  financial-front (nginx)    │
  user ─────────────▶  serve dist/ + proxy /api/* │
                    └────────┬────────────────────┘
                             │ http://financial:8080/api/*
                             ▼
                    ┌─────────────────────────────┐
                    │  financial (jdk-21-jre)     │
                    │  Spring Boot fat jar        │
                    └────────┬────────────────────┘
                             │ JDBC
                             ▼
                    ┌─────────────────────────────┐
                    │  postgres:16-alpine         │
                    └─────────────────────────────┘
```

---

## 4. Data design
Volume nomeado para postgres (preservar dados entre rebuilds).

---

## 5. Interface design
Front e back na **mesma rede docker** (`financial-net`). Front faz proxy via nginx para `/api/*`. Sem mudança de endpoints.

---

## 6. Component design

**`financial/Dockerfile` (multi-stage):**
```dockerfile
# Stage 1: build lib security
FROM eclipse-temurin:21-jdk-alpine AS security-build
WORKDIR /security
COPY security/ .
RUN ./mvnw clean install -DskipTests

# Stage 2: build financial usando o .m2 do stage 1
FROM eclipse-temurin:21-jdk-alpine AS financial-build
COPY --from=security-build /root/.m2 /root/.m2
WORKDIR /app
COPY financial/ .
RUN ./mvnw clean package -DskipTests

# Stage 3: runtime
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=financial-build /app/target/financial-*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

> Nota: este Dockerfile fica na raiz do workspace (`D:\workspace\` ou raiz dos repos) já que precisa acessar `security/` e `financial/`. Alternativa: subir `security` para um Nexus/Artifactory privado. Para simplicidade local, multi-stage com `COPY` resolve.

**`financial-front/Dockerfile`:**
```dockerfile
# Stage 1: build
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: serve
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**`financial-front/nginx.conf`:**
```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  location /api/ {
    proxy_pass http://financial:8080/api/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  location / {
    try_files $uri $uri/ /index.html;  # SPA fallback
  }
}
```

**`docker-compose.yml` (raiz):**
```yaml
services:
  postgres:
    image: postgres:16-alpine
    env_file: .env
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - financial-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      retries: 5
    networks: [financial-net]

  financial:
    build:
      context: .
      dockerfile: financial/Dockerfile
    env_file: .env
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_PORT: 5432
      SERVER_PORT: 8080
    depends_on:
      postgres:
        condition: service_healthy
    networks: [financial-net]

  financial-front:
    build:
      context: ./financial-front
    ports:
      - "80:80"
    depends_on:
      - financial
    networks: [financial-net]

volumes:
  financial-postgres-data:

networks:
  financial-net:
```

---

## 7. UI
Sem mudança visual; apenas o front passa a rodar em `:80` em vez de `:5173`.

---

## 8. Runtime/ops
- Comando único: `docker-compose up -d --build`.
- `docker-compose logs -f financial` para acompanhar.
- `.env` permanece como única fonte de secrets.
- `docker-compose down` para parar; `down -v` para limpar volumes.

---

## 9. Security
- Containers em rede dedicada `financial-net` (não expostos diretamente exceto front).
- Postgres NÃO expõe porta para o host (acessível só via rede docker). Diego usa pgAdmin no container `tools` (profile da WORK-01) ou desativa via override em dev.
- Secrets via `.env` → `env_file:`.

---

## 10. Requirement mapping
Não implementa novo REQ; viabiliza deploy local de tudo.

---

## 11. Implementation plan input

| Sub-WORK | Objetivo |
|---|---|
| WORK-10.1 | Dockerfile `financial` (multi-stage) |
| WORK-10.2 | Dockerfile + nginx.conf `financial-front` |
| WORK-10.3 | `docker-compose.yml` raiz |
| WORK-10.4 | Ajustar `application.yml` para usar `POSTGRES_HOST=postgres` em ambiente docker |
| WORK-10.5 | Ajustar build do front para usar `/api` (proxy reverso) |
| WORK-10.6 | Smoke test E2E (login → CRUD → dashboard) via `http://localhost/` |

---

## 12. Test plan
- Manual E2E completo após `docker-compose up -d --build`.
- Tear down + rebuild + repeat (validar idempotência).

---

## 13. Open items
- **O-30:** Onde fica o `docker-compose.yml` final, dado que `security`, `financial` e `financial-front` são repos separados? Recomendo **um repositório de "orquestração"** ou usar git submodules. Para o ambiente local do Diego, fica em `D:\workspace\` ou `D:\claude\financial\` (raiz com junctions). Definir antes de implementar.
- **O-31:** Health check do `financial` container? Adicionar `HEALTHCHECK CMD curl -f http://localhost:8080/api/health || exit 1` no Dockerfile.
- **O-32:** Tag de imagem (latest, build, semver)? Usar `latest` localmente; pipeline futura cuida de versionamento.

---

## Critério de "pronto"
```
[ ] docker-compose up -d --build sobe os 3 serviços sem erro
[ ] http://localhost/ abre o front
[ ] Login funciona contra o back
[ ] CRUDs funcionam end-to-end via UI
[ ] Dashboard mostra dados
[ ] docker-compose down + up novamente preserva dados (volume)
[ ] Diego aprova explicitamente
```
