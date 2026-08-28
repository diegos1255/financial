-- Init script do container Postgres. Roda no PRIMEIRO boot do container
-- (quando o volume esta vazio) via /docker-entrypoint-initdb.d/.
--
-- Habilita a extensao pgvector no database. Idempotente.
--
-- IMPORTANTE: pra volumes ja existentes (containers criados antes desta
-- mudanca), este script NAO roda. O usuario precisa executar UMA VEZ manual:
--
--     docker exec -it financial-postgres psql -U financial -d financial \
--         -c "CREATE EXTENSION IF NOT EXISTS vector;"
--
-- Depois disso, o Hibernate conseguira criar chat_document_chunks com
-- coluna embedding vector(768) no proximo boot do backend.

CREATE EXTENSION IF NOT EXISTS vector;
