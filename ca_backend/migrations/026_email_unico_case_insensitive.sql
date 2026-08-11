-- A coluna já é UNIQUE, mas o PostgreSQL considera "Ana@..." e "ana@..."
-- valores distintos. A aplicação salva e pesquisa e-mails normalizados; este
-- índice protege a regra também contra inserções feitas fora da API.
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_email_case_insensitive
    ON usuarios ((LOWER(TRIM(email))));
