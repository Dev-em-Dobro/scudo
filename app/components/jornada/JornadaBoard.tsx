'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { JornadaStage, JornadaTask, JornadaTaskKind } from '@/app/types';
import type { CodeQuestProgress } from '@/app/lib/codequest/service';
import { getCurseducaSectionTitleByTaskId } from '@/app/lib/jornada/curseducaLessonTaskMap';
import ClampedHelpTooltip from '@/app/components/ui/ClampedHelpTooltip';

interface JornadaBoardProps {
    stages: JornadaStage[];
    tasks: JornadaTask[];
    editableStageId: string;
    initialCurrentRankLetter: string;
    initialCodeQuestProgress: CodeQuestProgress | null;
    hasCodeQuestAccount: boolean;
}

function groupTasksByStageId(tasks: JornadaTask[]): Map<string, JornadaTask[]> {
    const map = new Map<string, JornadaTask[]>();
    for (const task of tasks) {
        const list = map.get(task.stageId) ?? [];
        list.push(task);
        map.set(task.stageId, list);
    }
    for (const list of map.values()) {
        list.sort((a, b) => a.order - b.order);
    }
    return map;
}

type JornadaApiResponse = {
    tasks: JornadaTask[];
    editableStageId?: string;
    currentRankLetter?: string;
    codeQuestProgress?: CodeQuestProgress | null;
};

type JornadaSyncResponse = {
    ok: boolean;
    error?: string;
    snapshot?: JornadaApiResponse;
};

const EXTERNAL_SYNC_HELP =
    'Sincronize sua Scudo com as aulas concluídas na Curseduca e os exercícios concluídos do CodeQuest.';

const TASK_KIND_LABEL: Record<JornadaTaskKind, string> = {
    aula: 'Aula',
    projeto: 'Projeto',
    desafio: 'Desafio',
    conceito: 'Checkpoint',
    pratica: 'Exercício',
    entrega: 'Entrega',
    extra: 'Extra',
};

const RANK_EMOJI: Record<string, string> = {
    Ferro: '🔩',
    Bronze: '🥉',
    Prata: '🥈',
    Ouro: '🥇',
    Platina: '🏅',
    Esmeralda: '💚',
    Diamante: '💎',
    Mythril: '🔷',
    Mestre: '🟣',
    Lendário: '🌟',
};

const RANK_ICON_FALLBACK: Record<string, string> = {
    Ferro: 'hardware',
    Bronze: 'military_tech',
    Prata: 'verified',
    Ouro: 'emoji_events',
    Platina: 'workspace_premium',
    Esmeralda: 'ecg_heart',
    Diamante: 'diamond',
    Mythril: 'auto_awesome',
    Mestre: 'school',
    Lendário: 'crown',
};

const RANK_ICON_STYLE: Record<string, { box: string; icon: string }> = {
    Ferro: { box: 'bg-slate-500/20 border-slate-400/50', icon: 'text-white/90' },
    Bronze: { box: 'bg-orange-600/20 border-orange-500/50', icon: 'text-orange-300' },
    Prata: { box: 'bg-zinc-400/20 border-zinc-300/50', icon: 'text-zinc-100' },
    Ouro: { box: 'bg-yellow-500/20 border-yellow-400/50', icon: 'text-yellow-300' },
    Platina: { box: 'bg-cyan-500/20 border-cyan-400/50', icon: 'text-cyan-200' },
    Esmeralda: { box: 'bg-emerald-500/20 border-emerald-400/50', icon: 'text-emerald-300' },
    Diamante: { box: 'bg-sky-500/20 border-sky-400/50', icon: 'text-sky-300' },
    Mythril: { box: 'bg-indigo-500/20 border-indigo-400/50', icon: 'text-indigo-300' },
    Mestre: { box: 'bg-violet-500/20 border-violet-400/50', icon: 'text-[#a78bfa]' },
    Lendário: { box: 'bg-amber-500/20 border-amber-400/50', icon: 'text-amber-300' },
};

function inferTaskKind(task: JornadaTask): JornadaTaskKind {
    if (task.kind) {
        return task.kind;
    }

    const lower = task.title.toLowerCase();
    if (lower.includes('exercício')) {
        return 'pratica';
    }
    if (lower.includes('desafio')) {
        return 'desafio';
    }
    if (lower.includes('projeto')) {
        return 'projeto';
    }
    if (lower.includes('conceito') || task.description?.toLowerCase().includes('conceito-chave')) {
        return 'conceito';
    }
    if (lower.includes('entrega') || lower.includes('checkpoint')) {
        return 'entrega';
    }

    return 'aula';
}

function isInteractiveTarget(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    return Boolean(target.closest('button, a, input, textarea, select, label'));
}

function ExternalSyncHelpButton({ helpText }: Readonly<{ helpText: string }>) {
    return (
        <ClampedHelpTooltip ariaLabel={helpText} tooltipId="external-sync-tooltip" size="md">
            {helpText}
        </ClampedHelpTooltip>
    );
}

function PraticaTaskCard({
    task,
    codeQuestProgress,
    hasCodeQuestAccount,
}: Readonly<{
    task: JornadaTask;
    codeQuestProgress: CodeQuestProgress | null;
    hasCodeQuestAccount: boolean;
}>) {
    return (
        <div className="w-full text-left rounded-lg border border-[#6528d3]/30 bg-black p-3 select-none">
            <div className="flex items-start gap-2">
                <span
                    className="material-symbols-outlined shrink-0 mt-0.5 text-lg text-[#a78bfa]"
                    style={{ fontVariationSettings: "'FILL' 0" }}
                    aria-hidden
                >
                    fitness_center
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-normal text-white">{task.title}</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide bg-[#6528d3]/20 text-[#a78bfa] border border-[#6528d3]/40 mt-1">
                        Exercício
                    </span>
                    {codeQuestProgress ? (
                        <div className="mt-2 space-y-1.5">
                            <p className="text-[10px] text-white/70 font-semibold uppercase tracking-wide">Progresso CodeQuest</p>
                            {codeQuestProgress.byCategory.map((cat) => {
                                const width = cat.total > 0 ? Math.round((cat.done / cat.total) * 100) : 0;

                                return (
                                    <div key={cat.category}>
                                        <div className="flex justify-between text-[10px] text-white/70 mb-0.5">
                                            <span className="capitalize">{cat.category}</span>
                                            <span>{cat.done}/{cat.total}</span>
                                        </div>
                                        <div className="h-1 rounded-full bg-white/10 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-[#6528d3] transition-all duration-300"
                                                style={{ width: `${width}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            <p className="text-[10px] text-white/50 pt-0.5">
                                Total: {codeQuestProgress.completedExercises}/{codeQuestProgress.totalExercises} ({codeQuestProgress.percent}%)
                            </p>
                        </div>
                    ) : (
                        <p className="text-[10px] text-white/70 mt-1.5">
                            Nenhum progresso encontrado para este email no CodeQuest.
                        </p>
                    )}
                    {hasCodeQuestAccount === false ? (
                        <p className="text-[10px] text-white/70 mt-1.5">
                            Seu email não foi encontrado no CodeQuest ainda.
                        </p>
                    ) : null}
                    <a
                        href="https://code-quest-devquest.replit.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-[#6528d3] text-white hover:bg-[#5020b0] transition-colors"
                    >
                        <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '12px', fontVariationSettings: "'FILL' 1" }}
                            aria-hidden
                        >
                            open_in_new
                        </span>
                        <span>Ir para o CodeQuest</span>
                    </a>
                </div>
            </div>
        </div>
    );
}

function getTaskStatusLabel({
    status,
    isUpdating,
    isEditableStage,
    isCompletedStage,
    isFutureLockedStage,
}: Readonly<{
    status: JornadaTask['status'];
    isUpdating: boolean;
    isEditableStage: boolean;
    isCompletedStage: boolean;
    isFutureLockedStage: boolean;
}>) {
    if (isUpdating) {
        return 'Salvando...';
    }
    if (status === 'done' || isEditableStage) {
        return '';
    }
    if (isCompletedStage) {
        return 'Etapa concluída';
    }
    if (isFutureLockedStage) {
        return 'Aguardando desbloqueio';
    }

    return 'Acompanhamento restrito ao rank atual';
}

function RegularTaskButton({
    task,
    kind,
    status,
    isInteractive,
    statusLabel,
    onToggle,
    taskTitleLine,
}: Readonly<{
    task: JornadaTask;
    kind: JornadaTaskKind;
    status: JornadaTask['status'];
    isInteractive: boolean;
    statusLabel: string;
    onToggle: () => void;
    /** Quando definido (ex.: seção Curseduca + título), substitui só a linha principal. */
    taskTitleLine?: string;
}>) {
    return (
        <button
            type="button"
            onClick={onToggle}
            disabled={!isInteractive}
            className={`w-full text-left rounded-lg border border-[#333] bg-black p-3 transition-colors select-none ${isInteractive ? 'hover:border-[#6528d3] cursor-pointer' : 'cursor-not-allowed opacity-80'}`}
            aria-pressed={status === 'done'}
            aria-label={status === 'done' ? `Marcar como a fazer: ${task.title}` : `Marcar como concluída: ${task.title}`}
        >
            <div className="flex items-start gap-2">
                <span
                    className={`material-symbols-outlined shrink-0 mt-0.5 text-lg ${status === 'done' ? 'text-emerald-400' : 'text-white/50 dark:text-white/90'}`}
                    style={{
                        fontVariationSettings: status === 'done' ? "'FILL' 1" : "'FILL' 0",
                    }}
                    aria-hidden
                >
                    {status === 'done' ? 'check_box' : 'check_box_outline_blank'}
                </span>
                <div className="min-w-0">
                    <p
                        className={`text-sm font-normal ${status === 'done' ? 'text-white/80 dark:text-white/80 line-through' : 'text-white'}`}
                    >
                        {taskTitleLine ?? task.title}
                    </p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide bg-blue-500/20 text-blue-200 border border-blue-400/40 mt-1">
                        {TASK_KIND_LABEL[kind]}
                    </span>
                    {task.description && !(kind === 'conceito' && task.description === 'Conceito-chave') && (
                        <p className="text-xs text-white/50 dark:text-white/90 mt-1">{task.description}</p>
                    )}
                    {statusLabel ? (
                        <span
                            className={`inline-block mt-2 ml-1 text-[10px] font-medium uppercase tracking-wide ${status === 'done' ? 'text-[#a78bfa]' : 'text-white/50 dark:text-white/90'}`}
                        >
                            {statusLabel}
                        </span>
                    ) : null}
                </div>
            </div>
        </button>
    );
}

// SONAR: Este componente concentra estados e efeitos acoplados ao board; a quebra em hooks/subcomponentes sera feita em PR dedicado para evitar regressao de UX.
export default function JornadaBoard({
    stages,
    tasks,
    editableStageId,
    initialCurrentRankLetter,
    initialCodeQuestProgress,
    hasCodeQuestAccount,
}: Readonly<JornadaBoardProps>) {
    const [boardTasks, setBoardTasks] = useState<JornadaTask[]>(tasks);
    const [currentEditableStageId, setCurrentEditableStageId] = useState(editableStageId);
    const [currentRankLetter, setCurrentRankLetter] = useState(initialCurrentRankLetter);
    const [updatingTaskIds, setUpdatingTaskIds] = useState<Record<string, boolean>>({});
    const [requestError, setRequestError] = useState<string | null>(null);
    const [syncMessage, setSyncMessage] = useState<string | null>(null);
    const [isSyncingExternal, setIsSyncingExternal] = useState(false);
    const [isDraggingBoard, setIsDraggingBoard] = useState(false);
    const [codeQuestProgress, setCodeQuestProgress] = useState<CodeQuestProgress | null>(initialCodeQuestProgress);
    const externalSyncInFlightRef = useRef(false);
    const boardScrollRef = useRef<HTMLDivElement | null>(null);
    const dragStartXRef = useRef(0);
    const dragStartScrollLeftRef = useRef(0);
    const updateQueueRef = useRef<Promise<void>>(Promise.resolve());
    const inFlightTaskIdsRef = useRef<Set<string>>(new Set());

    const clearTaskUpdating = useCallback((taskId: string) => {
        inFlightTaskIdsRef.current.delete(taskId);
        setUpdatingTaskIds((current) => {
            const next = { ...current };
            delete next[taskId];
            return next;
        });
    }, []);

    const applyJornadaResponse = useCallback((data: JornadaApiResponse) => {
        if (Array.isArray(data.tasks)) {
            setBoardTasks(data.tasks);
        }
        if (typeof data.editableStageId === 'string' && data.editableStageId.length > 0) {
            setCurrentEditableStageId(data.editableStageId);
        }
        if (typeof data.currentRankLetter === 'string' && data.currentRankLetter.length > 0) {
            setCurrentRankLetter(data.currentRankLetter);
        }
        if ('codeQuestProgress' in data) {
            setCodeQuestProgress(data.codeQuestProgress ?? null);
        }
    }, []);

    const rollbackTaskStatus = useCallback((taskId: string, originalStatus: JornadaTask['status']) => {
        setBoardTasks((current) => current.map((task) => {
            if (task.id !== taskId) {
                return task;
            }

            return {
                ...task,
                status: originalStatus,
            };
        }));
    }, []);

    const [syncCodeQuestError, setSyncCodeQuestError] = useState<string | null>(null);

    const runCodeQuestSync = useCallback(async (): Promise<boolean> => {
        try {
            const res = await fetch('/api/jornada/codequest-sync', { method: 'POST' });
            if (!res.ok) {
                setSyncCodeQuestError('Não foi possível sincronizar o progresso do CodeQuest.');
                return false;
            }
            const data = await res.json() as JornadaApiResponse & { codeQuestProgress?: CodeQuestProgress | null };
            applyJornadaResponse(data);
            return true;
        } catch (error) {
            console.error('Falha ao sincronizar progresso do CodeQuest no cliente.', error);
            setSyncCodeQuestError('Erro de rede ao sincronizar com o CodeQuest.');
            return false;
        }
    }, [applyJornadaResponse]);

    const runCurseducaSync = useCallback(async (): Promise<boolean> => {
        try {
            const response = await fetch('/api/jornada/curseduca-sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json() as JornadaSyncResponse;
            if (!response.ok || !data.ok) {
                throw new Error(data.error ?? 'sync_failed');
            }

            if (data.snapshot) {
                applyJornadaResponse(data.snapshot);
            }
            return true;
        } catch {
            setRequestError(
                'Não foi possível sincronizar com as aulas concluídas agora. Tente novamente em instantes ou entre em contato com o suporte.',
            );
            return false;
        }
    }, [applyJornadaResponse]);

    const syncExternalPlatforms = useCallback(async () => {
        if (externalSyncInFlightRef.current) {
            return;
        }
        externalSyncInFlightRef.current = true;
        setIsSyncingExternal(true);
        setSyncCodeQuestError(null);
        setRequestError(null);
        setSyncMessage(null);

        try {
            let codeQuestOk = !hasCodeQuestAccount;
            if (hasCodeQuestAccount) {
                codeQuestOk = await runCodeQuestSync();
            }

            const curseducaOk = await runCurseducaSync();

            if (codeQuestOk && curseducaOk) {
                setSyncMessage(
                    hasCodeQuestAccount
                        ? 'Exercícios (CodeQuest) e aulas (Curseduca) sincronizados com a Scudo.'
                        : 'Aulas (Curseduca) sincronizadas com a Scudo.',
                );
            } else if (!codeQuestOk && curseducaOk) {
                setSyncMessage(
                    'Aulas (Curseduca) sincronizadas. O CodeQuest não pôde ser atualizado; veja o aviso acima.',
                );
            } else if (codeQuestOk && !curseducaOk && hasCodeQuestAccount) {
                setSyncMessage(
                    'CodeQuest sincronizado. As aulas (Curseduca) não puderam ser atualizadas; veja o aviso acima.',
                );
            }
        } finally {
            externalSyncInFlightRef.current = false;
            setIsSyncingExternal(false);
        }
    }, [hasCodeQuestAccount, runCodeQuestSync, runCurseducaSync]);

    const toggleTask = useCallback((taskId: string) => {
        const targetTask = boardTasks.find((task) => task.id === taskId);
        if (!targetTask) {
            return;
        }

        if (targetTask.stageId !== currentEditableStageId || inFlightTaskIdsRef.current.has(taskId)) {
            return;
        }

        inFlightTaskIdsRef.current.add(taskId);

        setRequestError(null);

        const nextDone = targetTask.status !== 'done';

        setBoardTasks((current) => current.map((task) => {
            if (task.id !== taskId) {
                return task;
            }
            return {
                ...task,
                status: nextDone ? 'done' : 'pending',
            };
        }));

        setUpdatingTaskIds((current) => ({ ...current, [taskId]: true }));

        updateQueueRef.current = updateQueueRef.current
            .then(async () => {
                const response = await fetch('/api/jornada', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ taskId, done: nextDone }),
                });

                if (!response.ok) {
                    throw new Error('Falha ao atualizar progresso da tarefa.');
                }

                const data = await response.json() as JornadaApiResponse;
                applyJornadaResponse(data);
            })
            .catch(() => {
                rollbackTaskStatus(taskId, targetTask.status);
                setRequestError('Não foi possível salvar o progresso agora. Tente novamente.');
            })
            .finally(() => {
                clearTaskUpdating(taskId);
            });
    }, [applyJornadaResponse, boardTasks, clearTaskUpdating, currentEditableStageId, rollbackTaskStatus]);

    const tasksByStage = useMemo(() => groupTasksByStageId(boardTasks), [boardTasks]);
    const sortedStages = useMemo(() => [...stages].sort((a, b) => a.order - b.order), [stages]);
    const currentEditableStage = useMemo(
        () => sortedStages.find((stage) => stage.id === currentEditableStageId) ?? null,
        [currentEditableStageId, sortedStages],
    );
    const currentEditableStageIndex = useMemo(
        () => (currentEditableStage ? sortedStages.findIndex((stage) => stage.id === currentEditableStage.id) : -1),
        [currentEditableStage, sortedStages],
    );
    const nextStage = useMemo(
        () => (currentEditableStageIndex >= 0 ? sortedStages[currentEditableStageIndex + 1] ?? null : null),
        [currentEditableStageIndex, sortedStages],
    );
    const currentEditableStageOrder = useMemo(() => (
        sortedStages.find((stage) => stage.id === currentEditableStageId)?.order ?? Number.POSITIVE_INFINITY
    ), [currentEditableStageId, sortedStages]);

    const currentStageTasks = currentEditableStage ? tasksByStage.get(currentEditableStage.id) ?? [] : [];
    const completedCurrentStageTasks = currentStageTasks.filter((task) => task.status === 'done').length;
    const totalCurrentStageTasks = currentStageTasks.length;
    const currentStageProgressPercent = totalCurrentStageTasks > 0
        ? Math.round((completedCurrentStageTasks / totalCurrentStageTasks) * 100)
        : 0;

    const tasksToNextRank = currentStageTasks.filter((task) => task.status !== 'done').length;

    const formatTaskCount = (count: number) => `${count} ${count === 1 ? 'tarefa' : 'tarefas'}`;

    const scrollBoardBy = useCallback((delta: number) => {
        boardScrollRef.current?.scrollBy({
            left: delta,
            behavior: 'smooth',
        });
    }, []);

    const handleBoardPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.pointerType !== 'mouse' || isInteractiveTarget(event.target)) {
            return;
        }

        const container = boardScrollRef.current;
        if (!container) {
            return;
        }

        // Evita seleção de texto nativa ao arrastar o board.
        event.preventDefault();
        container.setPointerCapture(event.pointerId);
        dragStartXRef.current = event.clientX;
        dragStartScrollLeftRef.current = container.scrollLeft;
        setIsDraggingBoard(true);
    }, []);

    const handleBoardPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
        if (!isDraggingBoard) {
            return;
        }

        const container = boardScrollRef.current;
        if (!container) {
            return;
        }

        const dragDistance = event.clientX - dragStartXRef.current;
        container.scrollLeft = dragStartScrollLeftRef.current - dragDistance;
    }, [isDraggingBoard]);

    const stopBoardDragging = useCallback((event?: ReactPointerEvent<HTMLDivElement>) => {
        if (event?.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
        }

        setIsDraggingBoard(false);
    }, []);

    return (
        <div className="space-y-6">
            <div className="rounded-2xl border border-[#333] bg-[#1a1a1a] p-5 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                        <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#ededed] [font-family:'Ubuntu',Helvetica]">
                            Sincronização_
                        </span>
                        <p className="mt-2 text-[14px] text-white/70 leading-relaxed [font-family:'Ubuntu',Helvetica]">
                            {hasCodeQuestAccount && codeQuestProgress
                                ? <>CodeQuest: <span className="font-bold text-white">{codeQuestProgress.completedExercises}/{codeQuestProgress.totalExercises}</span> exercícios ({codeQuestProgress.percent}%). Aulas vêm da Curseduca.</>
                                : hasCodeQuestAccount
                                    ? 'Progresso do CodeQuest ainda não carregado. Aulas vêm da Curseduca.'
                                    : 'CodeQuest não vinculado ao seu e-mail. Aulas vêm da Curseduca.'}
                        </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                void syncExternalPlatforms();
                            }}
                            disabled={isSyncingExternal}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] px-5 py-2.5 text-[13px] font-bold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer [font-family:'Ubuntu',Helvetica]"
                        >
                            {isSyncingExternal ? 'Sincronizando…' : 'Sincronizar'}
                        </button>
                        <ExternalSyncHelpButton helpText={EXTERNAL_SYNC_HELP} />
                    </div>
                </div>

                {syncCodeQuestError ? (
                    <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2">
                        <p className="text-xs text-red-200">{syncCodeQuestError}</p>
                    </div>
                ) : null}
                {requestError ? (
                    <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2">
                        <p className="text-xs text-red-200">{requestError}</p>
                    </div>
                ) : null}
                {syncMessage ? (
                    <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                        <p className="text-xs text-emerald-200">{syncMessage}</p>
                    </div>
                ) : null}
            </div>

            {/* Rank em destaque */}
            {(() => {
                const rankStyle = RANK_ICON_STYLE[currentRankLetter]
                    ?? { box: 'bg-amber-500/20 border-amber-500/50', icon: 'text-amber-400' };
                const hasRankEmoji = Boolean(RANK_EMOJI[currentRankLetter]);
                const isLendario = currentRankLetter === 'Lendário';

                return (
                    <div className="rounded-2xl border border-[#333] bg-[#1a1a1a] p-6 md:p-8" style={{ borderTopColor: '#6528d3', borderTopWidth: '2px' }}>
                        <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
                            {/* Ícone gigante do rank */}
                            <div className={`flex items-center justify-center w-24 h-24 md:w-28 md:h-28 rounded-2xl border-2 shrink-0 ${rankStyle.box}`}>
                                <span
                                    className={rankStyle.icon}
                                    style={{
                                        fontSize: '56px',
                                        lineHeight: 1,
                                        fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif',
                                    }}
                                    aria-hidden
                                >
                                    {RANK_EMOJI[currentRankLetter] ?? ''}
                                </span>
                                {hasRankEmoji ? null : (
                                    <span
                                        className={`material-symbols-outlined ${rankStyle.icon}`}
                                        style={{ fontSize: '56px', fontVariationSettings: "'FILL' 1, 'wght' 600" }}
                                        aria-hidden
                                    >
                                        {RANK_ICON_FALLBACK[currentRankLetter] ?? 'military_tech'}
                                    </span>
                                )}
                            </div>

                            {/* Nome do rank em destaque + progress */}
                            <div className="flex-1 min-w-0">
                                <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#a78bfa] [font-family:'Ubuntu',Helvetica]">
                                    Seu rank_
                                </span>
                                <p className="mt-2 text-[40px] md:text-[48px] font-black text-white leading-none [font-family:'Ubuntu',Helvetica]">
                                    {currentRankLetter}
                                </p>
                                <div className="mt-5 max-w-md">
                                    <div className="flex justify-between text-[12px] font-bold text-white/70 mb-2 [font-family:'Ubuntu',Helvetica]">
                                        <span className="uppercase tracking-[1px]">Progresso</span>
                                        <span className="tabular-nums">{completedCurrentStageTasks} / {totalCurrentStageTasks}</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-[#6528d3] transition-all duration-300"
                                            style={{ width: `${currentStageProgressPercent}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Alert curto */}
                        {isLendario ? (
                            <p className="mt-6 text-[14px] font-bold text-[#22c55e] [font-family:'Ubuntu',Helvetica]">
                                Pronto pra concorrer às vagas. Boa sorte.
                            </p>
                        ) : (
                            <p className="mt-6 text-[14px] text-white/70 [font-family:'Ubuntu',Helvetica]">
                                Faltam <span className="font-bold text-white">{formatTaskCount(tasksToNextRank)}</span>
                                {nextStage ? <> pra liberar <span className="font-bold text-[#a78bfa]">Rank {nextStage.rankLetter}</span>.</> : ' pra concluir o rank atual.'}
                            </p>
                        )}
                    </div>
                );
            })()}

            {/* Board de ranks */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#ededed] [font-family:'Ubuntu',Helvetica]">
                    Todos os ranks_
                </span>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => scrollBoardBy(-340)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#333] bg-[#1a1a1a] text-white/80 hover:text-white hover:border-[#6528d3]/40 transition-colors"
                        aria-label="Rolar ranks para a esquerda"
                    >
                        <span className="material-symbols-outlined text-base" aria-hidden="true">chevron_left</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => scrollBoardBy(340)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#333] bg-[#1a1a1a] text-white/80 hover:text-white hover:border-[#6528d3]/40 transition-colors"
                        aria-label="Rolar ranks para a direita"
                    >
                        <span className="material-symbols-outlined text-base" aria-hidden="true">chevron_right</span>
                    </button>
                </div>
            </div>

            <div
                ref={boardScrollRef}
                onPointerDown={handleBoardPointerDown}
                onPointerMove={handleBoardPointerMove}
                onPointerUp={stopBoardDragging}
                onPointerCancel={stopBoardDragging}
                className={`w-full max-w-full snap-x snap-mandatory overflow-x-scroll overflow-y-hidden scroll-smooth pb-4 scrollbar-modern select-none ${isDraggingBoard ? 'cursor-grabbing' : 'cursor-grab'}`}
            >
                <div className="flex w-max min-w-full gap-4 px-1">
                    {sortedStages.map((stage) => {
                        const isEditableStage = stage.id === currentEditableStageId;
                        const isCompletedStage = stage.order < currentEditableStageOrder;
                        const isFutureLockedStage = stage.order > currentEditableStageOrder;
                        const stageTasks = (tasksByStage.get(stage.id) ?? []).sort((a, b) => a.order - b.order);
                        let stageContent: React.ReactNode;

                        if (isFutureLockedStage) {
                            stageContent = (
                                <div className="h-full min-h-40 rounded-lg border border-[#333] bg-black/40 p-4 flex flex-col items-center justify-center text-center">
                                    <span
                                        className="material-symbols-outlined text-white/40"
                                        style={{ fontSize: '32px', fontVariationSettings: "'FILL' 1" }}
                                        aria-hidden
                                    >
                                        lock
                                    </span>
                                    <p className="mt-3 text-[12px] font-bold uppercase tracking-[2px] text-white/50 [font-family:'Ubuntu',Helvetica]">
                                        Bloqueado
                                    </p>
                                </div>
                            );
                        } else if (stageTasks.length === 0) {
                            stageContent = <p className="text-xs text-white/70 dark:text-white/80 py-2">Nenhuma tarefa</p>;
                        } else {
                            stageContent = stageTasks.map((task) => {
                                const status = task.status;
                                const kind = inferTaskKind(task);
                                const isUpdating = Boolean(updatingTaskIds[task.id]);
                                const isPratica = kind === 'pratica';
                                const isInteractive = isEditableStage && !isUpdating && !isPratica;
                                const statusLabel = getTaskStatusLabel({
                                    status,
                                    isUpdating,
                                    isEditableStage,
                                    isCompletedStage,
                                    isFutureLockedStage,
                                });

                                if (isPratica && isEditableStage && status !== 'done') {
                                    return (
                                        <PraticaTaskCard
                                            key={task.id}
                                            task={task}
                                            codeQuestProgress={codeQuestProgress}
                                            hasCodeQuestAccount={hasCodeQuestAccount}
                                        />
                                    );
                                }

                                const sectionTitle = kind === 'aula' ? getCurseducaSectionTitleByTaskId(task.id) : null;
                                const taskTitleLine = sectionTitle ? `${sectionTitle} - ${task.title}` : undefined;

                                return (
                                    <RegularTaskButton
                                        key={task.id}
                                        task={task}
                                        kind={kind}
                                        status={status}
                                        isInteractive={isInteractive}
                                        statusLabel={statusLabel}
                                        taskTitleLine={taskTitleLine}
                                        onToggle={() => {
                                            toggleTask(task.id);
                                        }}
                                    />
                                );
                            });
                        }

                        return (
                            <div
                                key={stage.id}
                                className={`shrink-0 snap-start w-80 sm:w-72 lg:w-70 flex flex-col rounded-xl border border-[#333] bg-[#1a1a1a] overflow-hidden ${isFutureLockedStage ? 'opacity-60' : 'opacity-100'}`}
                            >
                                <div className="p-4 border-b border-[#333]">
                                    <h3 className="text-sm font-bold text-white leading-tight">{stage.title}</h3>
                                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-500/20 text-blue-200 border border-blue-400/50">
                                            {stage.faixa}
                                        </span>
                                        {!isEditableStage && isCompletedStage && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                                Etapa concluída
                                            </span>
                                        )}
                                        {!isEditableStage && isFutureLockedStage && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-[1px] bg-white/5 text-white/50 border border-[#333]">
                                                Bloqueado
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[60vh] scrollbar-modern">
                                    {stageContent}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
