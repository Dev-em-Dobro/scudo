'use client';

import { useCallback, useEffect, useState } from 'react';
import type { JornadaStage, JornadaTask } from '@/app/types';

const LOCAL_STORAGE_KEY = 'jornada-tasks-done';

interface JornadaBoardProps {
    stages: JornadaStage[];
    tasks: JornadaTask[];
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

function loadDoneOverrides(): Record<string, boolean> {
    if (typeof window === 'undefined') return {};
    try {
        const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
        return {};
    }
}

function saveDoneOverrides(overrides: Record<string, boolean>) {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(overrides));
    } catch {
        // ignore
    }
}

export default function JornadaBoard({ stages, tasks }: JornadaBoardProps) {
    const [doneOverrides, setDoneOverrides] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setDoneOverrides(loadDoneOverrides());
    }, []);

    const getEffectiveStatus = useCallback(
        (task: JornadaTask): 'done' | 'pending' => {
            if (task.id in doneOverrides) return doneOverrides[task.id] ? 'done' : 'pending';
            return task.status;
        },
        [doneOverrides]
    );

    const toggleTask = useCallback((taskId: string) => {
        setDoneOverrides((prev) => {
            const current = taskId in prev ? prev[taskId] : (tasks.find((t) => t.id === taskId)?.status === 'done');
            const next = { ...prev, [taskId]: !current };
            saveDoneOverrides(next);
            return next;
        });
    }, [tasks]);

    const tasksByStage = groupTasksByStageId(tasks);
    const sortedStages = [...stages].sort((a, b) => a.order - b.order);

    const completedCount = tasks.filter((t) => getEffectiveStatus(t) === 'done').length;
    const totalCount = tasks.length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    let currentRankLetter = 'I';
    for (let i = sortedStages.length - 1; i >= 0; i--) {
        const stage = sortedStages[i];
        const stageTasks = tasksByStage.get(stage.id) ?? [];
        const hasDone = stageTasks.some((t) => getEffectiveStatus(t) === 'done');
        if (hasDone) {
            currentRankLetter = stage.rankLetter;
            break;
        }
    }

    const level = 1 + Math.min(49, Math.floor(completedCount / 2));

    return (
        <div className="space-y-6">
            {/* Ficha RPG do aluno */}
            <div className="rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark p-5 shadow-sm">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-300 mb-4">
                    Sua ficha
                </h2>
                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/20 border-2 border-primary/50">
                            <span className="text-2xl font-black text-primary tabular-nums">{level}</span>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-400 dark:text-slate-300 uppercase tracking-wide">Nível</p>
                            <p className="text-lg font-bold text-white">{level}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-amber-500/20 border-2 border-amber-500/50">
                            <span className="text-2xl font-black text-amber-400">{currentRankLetter}</span>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-400 dark:text-slate-300 uppercase tracking-wide">Rank atual</p>
                            <p className="text-lg font-bold text-white">Rank {currentRankLetter}</p>
                        </div>
                    </div>
                    <div className="flex-1 min-w-[200px] max-w-md">
                        <div className="flex justify-between text-xs font-medium text-slate-400 dark:text-slate-300 mb-1">
                            <span>Progresso</span>
                            <span>{completedCount} / {totalCount} tarefas</span>
                        </div>
                        <div className="h-2.5 rounded-full bg-slate-700 dark:bg-slate-800 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-primary transition-all duration-300"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>
                </div>
                {currentRankLetter !== 'S' ? (
                    <div className="mt-4 flex items-start gap-3 p-4 rounded-lg border border-amber-500/30 bg-amber-500/10">
                        <span className="material-symbols-outlined text-amber-400 shrink-0" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>info</span>
                        <p className="text-sm text-amber-200/90">
                            Com seu nível atual, não concorra às vagas ainda. Conclua as etapas da jornada antes de se candidatar.
                        </p>
                    </div>
                ) : (
                    <div className="mt-4 flex items-start gap-3 p-4 rounded-lg border border-primary/30 bg-primary/10">
                        <span className="material-symbols-outlined text-primary shrink-0" style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}>verified</span>
                        <p className="text-sm text-primary/90">
                            Você está pronto para concorrer às vagas. Boa sorte!
                        </p>
                    </div>
                )}
            </div>

            {/* Board de ranks */}
            <div className="overflow-x-auto pb-4 scrollbar-modern">
                <div className="flex gap-4 min-w-max">
                    {sortedStages.map((stage) => {
                        const stageTasks = (tasksByStage.get(stage.id) ?? []).sort((a, b) => a.order - b.order);
                        return (
                            <div
                                key={stage.id}
                                className="flex-shrink-0 w-[280px] flex flex-col rounded-xl border border-border-light dark:border-border-dark bg-white dark:bg-surface-dark overflow-hidden"
                            >
                                <div className="p-4 border-b border-border-light dark:border-border-dark">
                                    <h3 className="text-sm font-bold text-white leading-tight">{stage.title}</h3>
                                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary/15 text-primary border border-primary/30">
                                            {stage.faixa}
                                        </span>
                                        {stage.levelRange && (
                                            <span className="text-xs text-slate-400 dark:text-slate-300">
                                                Níveis {stage.levelRange}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[60vh] scrollbar-modern">
                                    {stageTasks.length === 0 ? (
                                        <p className="text-xs text-slate-400 dark:text-slate-300 py-2">Nenhuma tarefa</p>
                                    ) : (
                                        stageTasks.map((task) => {
                                            const status = getEffectiveStatus(task);
                                            return (
                                                <div
                                                    key={task.id}
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => toggleTask(task.id)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === ' ') {
                                                            e.preventDefault();
                                                            toggleTask(task.id);
                                                        }
                                                    }}
                                                    className="rounded-lg border border-border-light dark:border-border-dark bg-background-light dark:bg-background-dark p-3 transition-colors hover:border-primary/30 cursor-pointer select-none"
                                                    aria-pressed={status === 'done'}
                                                    aria-label={status === 'done' ? `Marcar como a fazer: ${task.title}` : `Marcar como concluída: ${task.title}`}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <span
                                                            className={`material-symbols-outlined shrink-0 mt-0.5 text-lg ${status === 'done' ? 'text-primary' : 'text-slate-400 dark:text-slate-300'
                                                                }`}
                                                            style={{
                                                                fontVariationSettings: status === 'done' ? "'FILL' 1" : "'FILL' 0",
                                                            }}
                                                            aria-hidden
                                                        >
                                                            {status === 'done' ? 'check_circle' : 'radio_button_unchecked'}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <p
                                                                className={`text-sm font-semibold ${status === 'done' ? 'text-slate-300 dark:text-slate-400 line-through' : 'text-white'
                                                                    }`}
                                                            >
                                                                {task.title}
                                                            </p>
                                                            {task.description && (
                                                                <p className="text-xs text-slate-400 dark:text-slate-300 mt-1">{task.description}</p>
                                                            )}
                                                            <span
                                                                className={`inline-block mt-2 text-[10px] font-medium uppercase tracking-wide ${status === 'done'
                                                                        ? 'text-primary'
                                                                        : 'text-slate-400 dark:text-slate-300'
                                                                    }`}
                                                            >
                                                                {status === 'done' ? 'Concluída' : 'Clique para marcar'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
