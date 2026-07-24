ALTER TABLE servicos_solicitados
    ADD COLUMN IF NOT EXISTS atendimento_latitude NUMERIC(10, 7)
        CHECK (
            atendimento_latitude IS NULL
            OR atendimento_latitude BETWEEN -90 AND 90
        ),
    ADD COLUMN IF NOT EXISTS atendimento_longitude NUMERIC(10, 7)
        CHECK (
            atendimento_longitude IS NULL
            OR atendimento_longitude BETWEEN -180 AND 180
        );
