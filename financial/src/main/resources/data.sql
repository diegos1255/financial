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
SELECT gen_random_uuid(), 'Contas Bancárias', '/bank-accounts', 'credit-card', 3, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE route = '/bank-accounts');

INSERT INTO menus (id, label, route, icon, sort_order, active, created_date, updated_date)
SELECT gen_random_uuid(), 'Salários', '/salaries', 'dollar-sign', 4, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE route = '/salaries');

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
SELECT gen_random_uuid(), 'Rescisão', '/severance', 'handshake', 8, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE label = 'Rescisão');

INSERT INTO menus (id, label, route, icon, sort_order, active, created_date, updated_date)
SELECT gen_random_uuid(), 'Email', '/email', 'mail', 9, true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM menus WHERE label = 'Email');

-- Email desceu uma posicao com a entrada da Rescisao (WORK-31).
UPDATE menus SET sort_order = 9 WHERE label = 'Email' AND sort_order = 8;

-- Acentos nos labels antigos (WORK-33). Os inserts acima checam por rota para nao duplicar.
UPDATE menus SET label = 'Contas Bancárias' WHERE route = '/bank-accounts' AND label = 'Contas Bancarias';
UPDATE menus SET label = 'Salários' WHERE route = '/salaries' AND label = 'Salarios';
