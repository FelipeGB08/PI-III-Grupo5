CREATE INDEX IF NOT EXISTS idx_profissional_agenda_horarios_ativos
    ON profissional_agenda_horarios (profissional_id, dia_semana, horario)
    WHERE ativo = TRUE;
