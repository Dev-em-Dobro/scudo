# Implementação do Sistema de Streak da Jornada

## Objetivo
Implementar um sistema de consistência diária na Jornada do aluno, no estilo streak:
- o aluno ganha +1 ponto por dia ao concluir pelo menos 1 tarefa elegível;
- o streak evolui por dias consecutivos;
- badges são desbloqueadas em marcos configuráveis;
- a experiência é exibida tanto no board da Jornada quanto no Header.

## Escopo entregue
- Persistência completa de streak, atividade diária e badges no banco.
- Regras de negócio para pontuação diária e continuidade/quebra de sequência.
- Integração da informação de streak no snapshot da Jornada.
- Retorno de eventos de feedback no PATCH da Jornada:
  - streakAwardedToday
  - newlyUnlockedBadges
- Endpoint dedicado para resumo de streak no Header.
- UI de streak na Jornada com badges e progresso para próxima badge.
- Indicador de streak no Header, clicável para Jornada.
- Ajustes de texto em pt-BR e opção de fechar mensagens diária/final no painel.

## Arquitetura geral
A implementação foi separada em 3 camadas:

1. Banco e segurança
- Novos modelos Prisma para streak e badges.
- Migration com índices, FKs, seed de badges e políticas RLS.

2. Domínio/backend
- Serviço dedicado para regras de streak e projeção de dados para UI.
- Orquestração da Jornada para combinar progresso de tarefas com streak.

3. APIs e frontend
- APIs da Jornada retornando snapshot com streak.
- Componentes de UI (Jornada e Header) consumindo dados e exibindo feedback.

## Modelo de dados
Modelos adicionados ao Prisma:
- UserStreak
  - estado consolidado por usuário: currentStreakDays, longestStreakDays, streakPoints, lastQualifiedDay.
- UserStreakDailyActivity
  - deduplicação diária por usuário via chave única (userId, dayKey).
- StreakBadge
  - catálogo de badges configurável via banco (slug, nome, descrição, requiredDays, isActive).
- UserStreakBadge
  - vínculo usuário-badge com awardedAt.

Relações adicionadas em User:
- streak
- streakBadges
- streakDailyActivities

## Segurança e RLS
Na migration de streak:
- RLS habilitado em UserStreak, UserStreakDailyActivity, UserStreakBadge e StreakBadge.
- Policies de owner para tabelas de usuário com app.user_id.
- Policy de leitura para StreakBadge.
- Grants explícitos para app_user.

Com isso, a camada de aplicação opera dentro do contexto de usuário com isolamento por RLS.

## Regras de negócio
As regras centrais estão em app/lib/jornada/streak.ts:

1. Timezone de referência
- O dia válido do streak é calculado em America/Sao_Paulo.

2. Deduplicação diária
- Se o aluno conclui mais de uma tarefa no mesmo dia, pontua apenas uma vez.
- Isso é garantido por createMany + skipDuplicates em UserStreakDailyActivity.

3. Evolução do streak
- Primeiro dia qualificado: inicia em 1.
- Dia consecutivo (gap = 1): incrementa streak atual.
- Gap maior que 1: reinicia streak atual para 1.
- longestStreakDays é atualizado com o maior valor histórico.
- streakPoints incrementa somente quando há novo dia qualificado.

4. Desbloqueio de badges
- Busca badges ativas com requiredDays <= streak atual.
- Evita duplicação usando comparação com UserStreakBadge já existentes.
- Persiste novos desbloqueios em lote (createMany + skipDuplicates).

5. Projeção para UI
- badges retornam com earnedAt quando conquistadas.
- nextBadge é calculada como a próxima badge ativa não conquistada.
- daysRemaining usa requiredDays - currentStreakDays.

## Integração no serviço da Jornada
No app/lib/jornada/service.ts:

1. Snapshot da Jornada
- getUserJornadaSnapshot retorna streak junto do restante do board.
- Leitura de progresso e streak ocorre dentro de withRlsUserContext.

2. Marcação de tarefa (PATCH)
- setTaskDoneForUser faz upsert da tarefa do usuário.
- Em seguida executa awardDailyStreakForTask na mesma transação RLS.
- Retorna:
  - streakAwardedToday
  - newlyUnlockedBadges (detalhes das badges desbloqueadas)

Observação técnica importante:
- Para evitar erro de transação encerrada no Prisma, consultas no mesmo transaction foram mantidas sequenciais em pontos críticos.

## APIs impactadas

1. app/api/jornada/route.ts
- GET: mantém snapshot completo da Jornada (agora com streak).
- PATCH: além do snapshot, retorna streakAwardedToday e newlyUnlockedBadges.

2. app/api/jornada/codequest-sync/route.ts
- POST retorna também streak no payload de sincronização.

3. app/api/jornada/streak/route.ts
- Novo endpoint para resumo de streak no Header.
- Retorna:
  - currentStreakDays
  - hasCompletedTaskToday

Autorização aplicada nas rotas:
- sessão obrigatória via auth.api.getSession;
- acesso restrito a aluno oficial.

## Frontend

## Jornada
No app/components/jornada/JornadaBoard.tsx:
- Recebe initialStreak como estado inicial.
- Mostra:
  - streak atual;
  - maior streak;
  - pontos acumulados;
  - progresso para próxima badge;
  - lista de badges com estado conquistada/não conquistada.
- Mensagens de feedback:
  - diária (status do dia)
  - final (badge desbloqueada ou ponto diário garantido)
- UX adicionada:
  - botão para fechar mensagem diária;
  - botão para fechar mensagem final de streak.

## Header
No app/components/layout/Header.tsx:
- Busca resumo via /api/jornada/streak.
- Exibe indicador com ícone de fogo e total de dias.
- Link leva para /jornada.
- Tooltip contextual informa status de pontuação do dia.

## Migrações relacionadas
1. 20260419113000_add_jornada_streak_and_badges
- Cria tabelas, índices, FKs, seed inicial, RLS e grants.

2. 20260420230500_fix_streak_badges_ptbr_accents
- Corrige acentuação pt-BR nos nomes/descrições do catálogo padrão de badges.

## Checklist funcional validado
- Marcar uma tarefa elegível no dia concede no máximo 1 ponto diário.
- Concluir tarefas no mesmo dia não duplica pontuação.
- Ao avançar marcos, badges são desbloqueadas e exibidas na UI.
- Header reflete streak atual do usuário.
- Mensagens diária/final podem ser fechadas no board.

## Próximos passos sugeridos
- Extrair o bloco de streak do JornadaBoard para componente dedicado (redução de complexidade cognitiva).
- Adicionar testes automatizados de domínio para:
  - deduplicação diária;
  - reset por gap;
  - desbloqueio de badges em marcos múltiplos.
- Evoluir catálogo de badges para gestão administrativa (ativação/desativação por painel).
