-- Indice HNSW pra similarity search dos chunks do RAG (WORK-26).
-- A extensao pgvector eh criada pelo init-script do container Postgres
-- (postgres-init/01-pgvector.sql), rodando antes do Hibernate criar a tabela.
-- Este indice roda AQUI (data.sql = defer-datasource-init=true) porque a
-- tabela precisa existir primeiro, o que so acontece apos o DDL do Hibernate.
CREATE INDEX IF NOT EXISTS idx_chat_chunks_embedding
    ON chat_document_chunks USING hnsw (embedding vector_cosine_ops);

-- Seed idempotente da tabela menus.
-- Como nao temos UNIQUE em label (e nao queremos adicionar via migration), usamos WHERE NOT EXISTS.

INSERT INTO menus (id, label, route, icon, sort_order, active, created_date, updated_date)
SELECT gen_random_uuid(), 'Dashboard', '/dashboard', 'home', 1, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE label = 'Dashboard');

INSERT INTO menus (id, label, route, icon, sort_order, active, created_date, updated_date)
SELECT gen_random_uuid(), 'Categorias', '/categories', 'tag', 2, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE label = 'Categorias');

INSERT INTO menus (id, label, route, icon, sort_order, active, created_date, updated_date)
SELECT gen_random_uuid(), 'Contas Bancarias', '/bank-accounts', 'credit-card', 3, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE label = 'Contas Bancarias');

INSERT INTO menus (id, label, route, icon, sort_order, active, created_date, updated_date)
SELECT gen_random_uuid(), 'Salarios', '/salaries', 'dollar-sign', 4, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE label = 'Salarios');

INSERT INTO menus (id, label, route, icon, sort_order, active, created_date, updated_date)
SELECT gen_random_uuid(), 'Despesas', '/expenses', 'shopping-cart', 5, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE label = 'Despesas');

INSERT INTO menus (id, label, route, icon, sort_order, active, created_date, updated_date)
SELECT gen_random_uuid(), 'Investimentos', '/investments', 'trending-up', 6, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE label = 'Investimentos');

INSERT INTO menus (id, label, route, icon, sort_order, active, created_date, updated_date)
SELECT gen_random_uuid(), 'PJ', '/pj', 'briefcase', 7, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE label = 'PJ');

INSERT INTO menus (id, label, route, icon, sort_order, active, created_date, updated_date)
SELECT gen_random_uuid(), 'Email', '/email', 'mail', 8, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE label = 'Email');
