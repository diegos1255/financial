# WORK-10 — Docker Orquestrado (back + front + postgres)

**Status:** [x] Plano aprovado  [x] Spec aprovada  [x] Implementado

---

## Objetivo

`docker-compose up --build` no diretório `D:\workspace\financial` sobe os 3 serviços (postgres, backend, frontend) e o sistema funciona completamente em http://localhost sem precisar do Eclipse ou do Vite manual.

---

## Arquitetura de rede

```
Browser → http://localhost (porta 80)
           ↓
        [Nginx — financial-frontend]
           ├── GET /           → serve index.html (SPA fallback)
           ├── GET /assets/*   → serve arquivos estáticos
           └── /api/*          → proxy_pass http://backend:8080
                                       ↓
                              [Spring Boot — financial-backend]
                                       ↓
                              [PostgreSQL — financial-postgres]
```

Frontend e backend ficam na **mesma origem** (localhost:80) via proxy Nginx. CORS só ativo para desenvolvimento local.

---

## Contextos de build Docker

O `docker-compose.yml` fica em `D:\workspace\financial`. O backend depende da lib `security` que está em `D:\workspace\security` (diretório irmão). Solução: usar `context: ..` (aponta para `D:\workspace`) e referenciar `financial/Dockerfile`.

```
D:\workspace\                     ← contexto do build do backend
├── security\                     ← lib copiada e instalada no .m2 do build
│   ├── mvnw
│   └── src\
├── financial\                    ← app Spring Boot
│   ├── docker-compose.yml
│   ├── Dockerfile                ← referenciado como financial/Dockerfile
│   └── src\
└── financial-front\              ← contexto do build do frontend (independente)
    ├── Dockerfile
    └── src\
```

---

## 1. `D:\workspace\financial\Dockerfile`

```dockerfile
# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /build

# Instala a lib security no .m2 local
COPY security/ ./security/
RUN chmod +x security/mvnw \
 && cd security \
 && ./mvnw clean install -DskipTests -q

# Builda o app financial (já encontra security no .m2)
COPY financial/ ./financial/
RUN chmod +x financial/mvnw \
 && cd financial \
 && ./mvnw clean package -DskipTests -q

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /build/financial/target/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
```

---

## 2. `D:\workspace\financial-front\Dockerfile`

```dockerfile
# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# VITE_API_URL vazio → Axios usa URL relativa → Nginx faz proxy
RUN VITE_API_URL= npm run build

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

---

## 3. `D:\workspace\financial-front\nginx.conf`

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # SPA: qualquer rota desconhecida devolve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy transparente para o backend
    location /api/ {
        proxy_pass         http://backend:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
    }
}
```

---

## 4. `D:\workspace\financial\docker-compose.yml` (substituir o atual)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: financial-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    volumes:
      - financial-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ..
      dockerfile: financial/Dockerfile
    container_name: financial-backend
    restart: unless-stopped
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_PORT: 5432
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRATION_HOURS: ${JWT_EXPIRATION_HOURS:-8}
      SERVER_PORT: 8080
      SQL_INIT_MODE: always
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy

  frontend:
    build:
      context: ../financial-front
      dockerfile: Dockerfile
    container_name: financial-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  financial-postgres-data:
```

**Nota:** `backend` expõe 8080 para acesso direto em dev/debug. Em produção pura, esse port pode ser removido (só Nginx acessa via rede interna Docker).

---

## 5. `.env.example` (atualizar)

Sem novos campos obrigatórios. O `VITE_API_URL` é gerenciado via `.env.development` no frontend (não entra no `.env` do backend).

---

## 6. `.dockerignore` — criar em `D:\workspace\financial-front`

```
node_modules
dist
.env.local
.env.development
.env*.local
```

Impede copiar `node_modules` (pesado) e `.env.development` (tem URL de dev hardcoded) para dentro da imagem Docker.

---

## Como usar após a WORK-10

### Modo produção (Docker completo):
```powershell
cd D:\workspace\financial
docker-compose up --build
# Acessa: http://localhost
```

### Modo desenvolvimento (como hoje):
```powershell
# Terminal 1 — banco:
cd D:\workspace\financial
docker-compose up postgres

# Terminal 2 — backend pelo Eclipse (para ver logs)

# Terminal 3 — frontend:
cd D:\workspace\financial-front
npm run dev   # http://localhost:5174
```

---

## Validação (smoke test)

1. `docker-compose up --build` sem erros
2. `http://localhost` abre o login
3. Logar com `diego` / `Diego#2026`
4. Dashboard carrega com dados reais
5. Criar uma categoria — confirmar que persiste no banco
6. `docker-compose down` → `docker-compose up` (sem `--build`) → dados persistem (volume)

---

## Arquivos criados/alterados

- `D:\workspace\financial\Dockerfile` (novo)
- `D:\workspace\financial-front\Dockerfile` (novo)
- `D:\workspace\financial-front\nginx.conf` (novo)
- `D:\workspace\financial-front\.dockerignore` (novo)
- `D:\workspace\financial\docker-compose.yml` (atualizado — adiciona backend + frontend)
