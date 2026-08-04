-- As agendas padrao antigas eram apenas uma resposta de leitura e nao tinham
-- IDs persistidos. Materializamos essas agendas para que cada servico exibido
-- no aplicativo possa ser referenciado com seguranca no agendamento.
DO $$
DECLARE
    profissional RECORD;
BEGIN
    FOR profissional IN
        SELECT u.id
        FROM usuarios u
        WHERE u.perfil_tipo = 'profissional'
          AND NOT EXISTS (
              SELECT 1
              FROM profissional_agenda_servicos pas
              WHERE pas.profissional_id = u.id
          )
          AND NOT EXISTS (
              SELECT 1
              FROM profissional_agenda_horarios pah
              WHERE pah.profissional_id = u.id
          )
    LOOP
        INSERT INTO profissional_agenda_servicos
            (profissional_id, nome, duracao_minutos, preco, ativo, ordem)
        VALUES
            (profissional.id, 'Visita Tecnica', 40, 80, TRUE, 0),
            (profissional.id, 'Servico Residencial', 60, 120, TRUE, 1),
            (profissional.id, 'Orcamento no local', 30, 50, TRUE, 2);

        INSERT INTO profissional_agenda_horarios
            (profissional_id, dia_semana, horario, ativo)
        SELECT profissional.id, dia_semana, horario::time, TRUE
        FROM (VALUES
            (1, '09:00'), (1, '10:30'), (1, '14:00'), (1, '15:30'),
            (2, '09:00'), (2, '10:30'), (2, '14:00'), (2, '15:30'),
            (3, '09:00'), (3, '10:30'), (3, '14:00'), (3, '15:30'),
            (4, '09:00'), (4, '10:30'), (4, '14:00'), (4, '15:30'),
            (5, '09:00'), (5, '10:30'), (5, '14:00'), (5, '15:30')
        ) AS horarios(dia_semana, horario);
    END LOOP;
END $$;
