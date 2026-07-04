'use client';

import {
    getCodeQuestExerciseOptionsForTask,
} from '@/app/lib/jornada/codequestExerciseMap';
import {
    buildCodeQuestExerciseUrl,
    getCurseducaLessonUrlForTask,
} from '@/app/lib/jornada/practiceLinks';

type PracticeExercisePickerProps = Readonly<{
    taskId: string;
    taskTitle: string;
    completedExerciseIds?: string[];
    onClose: () => void;
}>;

export default function PracticeExercisePicker({
    taskId,
    taskTitle,
    completedExerciseIds,
    onClose,
}: PracticeExercisePickerProps) {
    const exercises = getCodeQuestExerciseOptionsForTask(taskId);
    const completed = new Set(completedExerciseIds ?? []);
    const curseducaUrl = getCurseducaLessonUrlForTask(taskId);
    const doneCount = exercises.filter((exercise) => completed.has(exercise.slug)).length;

    return (
        <dialog
            open
            className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-center justify-center border-0 bg-black/80 p-4 backdrop:bg-black/80"
            aria-labelledby="practice-picker-title"
            onCancel={(event) => {
                event.preventDefault();
                onClose();
            }}
            onClick={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div
                className="w-full max-w-lg bg-[#1a1a1a] border border-[#333] rounded-xl overflow-hidden shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-3 border-b border-[#333] p-4">
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-[2px] text-[#a78bfa]">
                            Exercícios CodeQuest
                        </p>
                        <h2 id="practice-picker-title" className="mt-1 text-base font-bold text-white leading-snug">
                            {taskTitle}
                        </h2>
                        <p className="mt-1 text-xs text-white/60">
                            {doneCount}/{exercises.length} concluído{doneCount === 1 ? '' : 's'} no CodeQuest
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar lista de exercícios"
                        className="shrink-0 text-white/70 hover:text-white transition-colors cursor-pointer"
                    >
                        <span className="material-symbols-outlined text-xl">close</span>
                    </button>
                </div>

                <ul className="max-h-[min(60vh,24rem)] overflow-y-auto scrollbar-modern p-2">
                    {exercises.map((exercise, index) => {
                        const isDone = completed.has(exercise.slug);

                        return (
                            <li key={exercise.slug}>
                                <a
                                    href={buildCodeQuestExerciseUrl(exercise.slug)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-white hover:bg-[#6528d3]/15 transition-colors"
                                >
                                    <span
                                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                            isDone
                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                                : 'bg-[#6528d3]/20 text-[#a78bfa] border border-[#6528d3]/40'
                                        }`}
                                        aria-hidden
                                    >
                                        {isDone ? '✓' : index + 1}
                                    </span>
                                    <span className="min-w-0 flex-1">{exercise.label}</span>
                                    <span
                                        className="material-symbols-outlined shrink-0 text-base text-white/50"
                                        style={{ fontVariationSettings: "'FILL' 1" }}
                                        aria-hidden
                                    >
                                        open_in_new
                                    </span>
                                </a>
                            </li>
                        );
                    })}
                </ul>

                {curseducaUrl ? (
                    <div className="border-t border-[#333] p-4">
                        <a
                            href={curseducaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-white/70 hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm" aria-hidden>
                                menu_book
                            </span>
                            Ver descrição completa na Curseduca
                        </a>
                    </div>
                ) : null}
            </div>
        </dialog>
    );
}
