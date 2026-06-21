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
