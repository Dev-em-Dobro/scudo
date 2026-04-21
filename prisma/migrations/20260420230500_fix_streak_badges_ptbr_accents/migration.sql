-- Corrige acentuação dos badges padrão de streak em PT-BR
UPDATE "StreakBadge"
SET
    "name" = 'Ritmo Inicial',
    "description" = 'Manteve 7 dias seguidos de consistência na jornada.',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'streak-7';

UPDATE "StreakBadge"
SET
    "name" = 'Constância de Ferro',
    "description" = 'Completou 30 dias seguidos concluindo ao menos uma tarefa por dia.',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'streak-30';

UPDATE "StreakBadge"
SET
    "name" = 'Foco Inabalável',
    "description" = 'Sustentou 60 dias seguidos de evolução diária na plataforma.',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'streak-60';

UPDATE "StreakBadge"
SET
    "name" = 'Lenda da Scudo',
    "description" = 'Alcançou 100 dias seguidos e virou referência de disciplina.',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'streak-100';
