# financial — backend

Backend Spring Boot do sistema **financial** (controle financeiro pessoal).
Visão geral em `D:\claude\financial\docs\02-development-plan.md`.

## Stack

- Java 21 LTS (Eclipse Temurin)
- Spring Boot 4.0.6
- Maven Wrapper (`mvnw`)
- PostgreSQL 16 (via Docker)
- Lib `security` local (importada via `.m2`)

## Rodar localmente

1. Pré-requisitos: Java 21, Docker Desktop e DBeaver instalados.
2. Copiar `.env.example` para `.env` e ajustar a `POSTGRES_PASSWORD`:
   ```powershell
   Copy-Item .env.example .env
   notepad .env
   ```
3. Subir o Postgres em container:
   ```powershell
   docker-compose up -d
   ```
4. Rodar o backend:
   ```powershell
   .\mvnw.cmd spring-boot:run
   ```
5. Smoke test:
   ```powershell
   curl http://localhost:8080/api/health
   ```
   Deve retornar 200 com JSON contendo `"status":"UP"`.

> A lib `security` ainda não está como dependência. Ela entra a partir da WORK-03 (autenticação).

## Conectar via DBeaver

- Host: `localhost`
- Porta: `5432` (ou o valor de `POSTGRES_PORT` no `.env`)
- Banco: `financial`
- Usuário/senha: conforme `.env`

## Parar tudo

```powershell
docker-compose down            # mantém os dados (volume nomeado)
docker-compose down -v         # apaga também o volume (zera o banco)
```
