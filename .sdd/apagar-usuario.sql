-- Apaga TODOS os dados do usuário de teste do sdd-diego (teste visual).
-- Recebe :login via psql -v. Só atinge logins 'sdd-teste-%' (nunca uma conta real).
-- Exceção consciente ao soft-delete: é limpeza de dado de teste, não regra do sistema.
\set ON_ERROR_STOP on
BEGIN;
CREATE TEMP TABLE alvo ON COMMIT DROP AS
  SELECT id FROM users WHERE login = :'login' AND login LIKE 'sdd-teste-%';

DELETE FROM installments WHERE expense_id IN (SELECT id FROM expenses WHERE user_id IN (SELECT id FROM alvo));
DELETE FROM expenses WHERE user_id IN (SELECT id FROM alvo);
DELETE FROM salary_payments WHERE user_id IN (SELECT id FROM alvo);
DELETE FROM salaries WHERE user_id IN (SELECT id FROM alvo);
DELETE FROM severance_payments WHERE user_id IN (SELECT id FROM alvo);
DELETE FROM severances WHERE user_id IN (SELECT id FROM alvo);
DELETE FROM investment_incomes WHERE user_id IN (SELECT id FROM alvo);
DELETE FROM investment_transactions WHERE user_id IN (SELECT id FROM alvo);
DELETE FROM investments WHERE user_id IN (SELECT id FROM alvo);
DELETE FROM pj_entries WHERE user_id IN (SELECT id FROM alvo);
DELETE FROM bank_accounts WHERE user_id IN (SELECT id FROM alvo);
DELETE FROM expense_categories WHERE user_id IN (SELECT id FROM alvo);
DELETE FROM gmail_credentials WHERE user_id IN (SELECT id FROM alvo);
DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM alvo);
DELETE FROM users WHERE id IN (SELECT id FROM alvo);
COMMIT;
