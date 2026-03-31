import { codeQuestPool } from './db';

export const CODEQUEST_TOTAL_EXERCISES = 65;

const CATEGORY_GROUPS: Record<string, string> = {
    html: 'HTML',
    css: 'CSS',
    javascript: 'JS',
};

export type CodeQuestCategoryProgress = {
    category: string;
    done: number;
    total: number;
};

export type CodeQuestProgress = {
    completedExercises: number;
    totalExercises: number;
    percent: number;
    allDone: boolean;
    byCategory: CodeQuestCategoryProgress[];
    completedExerciseIds: string[];
};

export async function fetchCodeQuestProgressByEmail(email: string): Promise<CodeQuestProgress | null> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
        return null;
    }

    try {
        const userResult = await codeQuestPool.query<{ firebase_id: string }>(
            `SELECT split_part(id, '/', 2) as firebase_id FROM users WHERE data->>'email' = $1 LIMIT 1`,
            [normalizedEmail],
        );

        if (userResult.rows.length === 0) {
            return null;
        }

        const firebaseId = userResult.rows[0].firebase_id;

        const [totalsResult, doneResult] = await Promise.all([
            codeQuestPool.query<{ category: string; total: string }>(
                `SELECT data->>'category' as category, COUNT(*) as total
                 FROM exercises WHERE parent_id IS NULL
                 GROUP BY category`,
            ),
            codeQuestPool.query<{ category: string; done: string; exercise_id: string }>(
                `SELECT e.data->>'category' as category, COUNT(*) OVER (PARTITION BY e.data->>'category') as done, e.data->>'id' as exercise_id
                 FROM user_progress up
                 JOIN exercises e ON e.data->>'id' = up.data->>'exerciseId'
                 WHERE up.data->>'userId' = $1 AND up.data->>'completed' = 'true'`,
                [firebaseId],
            ),
        ]);

        const totalsMap = new Map<string, number>();
        for (const r of totalsResult.rows) {
            const group = CATEGORY_GROUPS[r.category];
            if (group) {
                totalsMap.set(group, (totalsMap.get(group) ?? 0) + Number.parseInt(r.total, 10));
            }
        }

        const doneMap = new Map<string, number>();
        const completedExerciseIds: string[] = [];
        for (const r of doneResult.rows) {
            completedExerciseIds.push(r.exercise_id);
            const group = CATEGORY_GROUPS[r.category];
            if (group) {
                doneMap.set(group, Number.parseInt(r.done, 10));
            }
        }

        const order = ['HTML', 'CSS', 'JS'];
        const byCategory: CodeQuestCategoryProgress[] = order
            .filter(g => totalsMap.has(g))
            .map(g => ({
                category: g,
                done: doneMap.get(g) ?? 0,
                total: totalsMap.get(g) ?? 0,
            }));

        const completedExercisesCount = byCategory.reduce((sum, c) => sum + c.done, 0);
        const totalExercises = byCategory.reduce((sum, c) => sum + c.total, 0);
        const percent = totalExercises > 0 ? Math.round((completedExercisesCount / totalExercises) * 100) : 0;

        return {
            completedExercises: completedExercisesCount,
            totalExercises,
            percent,
            allDone: completedExercisesCount >= totalExercises,
            byCategory,
            completedExerciseIds,
        };
    } catch (error) {
        console.error('Falha ao buscar progresso do CodeQuest.', error);
        return null;
    }
}