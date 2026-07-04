/**
 * Catálogo CodeQuest ↔ tarefas da jornada.
 * Fonte única: slug, rótulo exibido no modal e taskId de sync.
 */
export type CodeQuestExerciseDef = {
    slug: string;
    label: string;
};

/** taskId → exercícios CodeQuest (1 = link direto; 2+ = modal de escolha). */
export const CODEQUEST_TASK_EXERCISES: Record<string, CodeQuestExerciseDef[]> = {
    // ── HTML (Ferro) — 1 aula Curseduca = 1 exercício CodeQuest ──
    'ferro-42': [{ slug: 'html-primeiro-paragrafo', label: 'Meu Primeiro Parágrafo' }],
    'ferro-43': [{ slug: 'html-tags-essenciais-paragrafo', label: 'Parágrafo' }],
    'ferro-37': [{ slug: 'html-lista-frutas', label: 'Lista de Frutas' }],
    'ferro-13': [{ slug: 'html-headings-paragrafos-listas', label: 'Tags essenciais: headings, parágrafos, listas' }],
    'ferro-38': [{ slug: 'html-tags-essenciais-link', label: 'Link' }],
    'ferro-39': [{ slug: 'html-tags-essenciais-imagem', label: 'Imagem' }],
    'ferro-15': [{ slug: 'html-atributos-links-imagens', label: 'Atributos, links e imagens' }],
    'ferro-17': [{ slug: 'html-tags-essenciais-comentarios', label: 'Comentários em HTML' }],
    'ferro-44': [{ slug: 'html-tags-essenciais-tabela', label: 'Tabela' }],
    'ferro-19': [{ slug: 'html-tabelas-basico', label: 'Tabelas em HTML' }],
    'ferro-40': [{ slug: 'html-tags-semanticas-estrutura', label: 'Estrutura Semântica' }],
    'ferro-21': [{ slug: 'html-semantica-estrutura-basica', label: 'Semântica no HTML' }],

    // ── CSS (Ferro) ──
    'ferro-26': [
        { slug: 'html-css-display-block-links', label: 'Exercício display block' },
        { slug: 'display-inline', label: 'Exercício display inline' },
        { slug: 'display-inline-block', label: 'Exercício display inline-block' },
    ],
    'ferro-28': [{ slug: 'css-seletores-classes-ids', label: 'Seletores, classes e IDs' }],
    'ferro-30': [{ slug: 'html-css-cores-fontes-estilizacao-texto', label: 'Cores, fontes e estilização de texto' }],
    'ferro-41': [{ slug: 'css-botao-colorido', label: 'Botão Colorido' }],
    'ferro-32': [{ slug: 'html-css-box-model-padding-margin-border-boxsizing', label: 'Box Model' }],

    // ── Flexbox / Grid (Bronze) ──
    'bronze-55': [{ slug: 'flexbox-flex-direction-column', label: 'Flex Direction' }],
    'bronze-4': [
        { slug: 'css-flexbox-justify-content', label: 'Alinhando itens com justify-content' },
        { slug: 'css-flexbox-justify-content-space-between', label: 'Distribuindo itens com justify-content: space-between' },
        { slug: 'css-flexbox-basico', label: 'Flexbox Básico' },
    ],
    'bronze-6': [
        { slug: 'css-flexbox-align-items-center', label: 'Centralizando Itens na Vertical com Align-Items' },
        { slug: 'css-flexbox-align-items-flex-end', label: 'Alinhando Itens na Parte Inferior com Align-Items' },
        { slug: 'flexbox-centralizar-div', label: 'Centralizando uma div com Flexbox' },
    ],
    'bronze-56': [
        { slug: 'flexbox-cards-produtos', label: 'Galeria de Produtos com Flexbox' },
        { slug: 'flexbox-flex-wrap-cards', label: 'Cards Responsivos com Flex-Wrap' },
    ],
    'bronze-58': [{ slug: 'flexbox-grow-basico', label: 'Grow' }],
    'bronze-19': [
        { slug: 'css-grid-basico', label: 'Grid Básico' },
        { slug: 'css-grid-template-columns-rows-gap', label: 'Grid com colunas, linhas e espaçamento' },
    ],
    'bronze-57': [{ slug: 'flexbox-layout-completo', label: 'GAP' }],
    'bronze-23': [{ slug: 'css-grid-area', label: 'Grid área' }],
    'bronze-25': [{ slug: 'grid-autofill-autofit', label: 'Grid auto-fill e auto-fit' }],
    'bronze-28': [
        { slug: 'css-responsividade-media-query', label: 'Responsividade com media queries' },
        { slug: 'display-none-media-query', label: 'Media queries e display none' },
    ],

    // ── JavaScript (Prata) ──
    'prata-2': [
        { slug: 'javascript-variaveis-console', label: 'Variáveis e console' },
        { slug: 'javascript-template-literal', label: 'Variáveis, console e template literal' },
        { slug: 'js-primeiro-alert', label: 'Primeiro Alert' },
    ],
    'prata-4': [{ slug: 'javascript-tipos-primitivos', label: 'Tipos primitivos' }],
    'prata-7': [
        { slug: 'javascript-operadores-logicos', label: 'Operadores lógicos (1)' },
        { slug: 'javascript-operadores-relacionais', label: 'Operadores lógicos (2)' },
        { slug: 'javascript-operador-not', label: 'Operadores lógicos (3)' },
    ],
    'prata-9': [{ slug: 'javascript-operadores-matematicos', label: 'Operadores matemáticos' }],
    'prata-11': [
        { slug: 'javascript-condicionais-if-else', label: 'Condicionais com if else' },
        { slug: 'javascript-condicional-switch', label: 'Condicionais com switch' },
    ],
    'prata-13': [
        { slug: 'javascript-loop-for', label: 'Laço de repetição for' },
        { slug: 'javascript-loop-while', label: 'Laço de repetição while' },
        { slug: 'javascript-loop-do-while', label: 'Laço de repetição do while' },
    ],
    'prata-15': [
        { slug: 'javascript-funcao-nomeada-saudar-usuario', label: 'Função nomeada — saudar usuário' },
        { slug: 'javascript-funcao-com-retorno-soma', label: 'Função com retorno — soma' },
    ],
    'prata-17': [{ slug: 'javascript-arrow-function', label: 'Arrow function' }],
    'prata-20': [{ slug: 'javascript-arrays-for-foreach', label: 'Percorrendo arrays com forEach' }],
    'prata-24': [
        { slug: 'javascript-arrays-frutas', label: 'Trabalhando com arrays' },
        { slug: 'javascript-filter-objetos', label: 'Filtrando arrays de objetos com filter' },
        { slug: 'javascript-find-array-objetos', label: 'Encontrando itens com find' },
        { slug: 'javascript-map-objetos', label: 'Modificando arrays de objetos com map' },
        { slug: 'javascript-objetos-pessoa', label: 'Trabalhando com objetos' },
        { slug: 'javascript-reduce-carrinho', label: 'Somando itens de um carrinho com reduce' },
        { slug: 'javascript-reduce-soma', label: 'Somando valores com reduce' },
        { slug: 'javascript-spread-operator', label: 'Copiando arrays com spread operator' },
        { slug: 'javascript-destructuring-rest-default', label: 'Desestruturação com valores padrão e rest' },
    ],
    'prata-35': [
        { slug: 'js-consumo-api-async-await', label: 'Consumindo API com async/await' },
        { slug: 'js-api-detalhes-usuario', label: 'Buscando informações detalhadas de usuário' },
        { slug: 'js-api-posts', label: 'Listando posts de uma API' },
    ],
};

export const CODEQUEST_EXERCISE_TASK_IDS: Record<string, string> = Object.fromEntries(
    Object.entries(CODEQUEST_TASK_EXERCISES).flatMap(([taskId, exercises]) =>
        exercises.map((exercise) => [exercise.slug, taskId]),
    ),
);

export const CODEQUEST_CATEGORY_TASK_IDS: Record<string, string[]> = {
    HTML: [
        'ferro-13', 'ferro-15', 'ferro-17', 'ferro-19', 'ferro-21',
        'ferro-37', 'ferro-38', 'ferro-39', 'ferro-40', 'ferro-42', 'ferro-43', 'ferro-44',
    ],
    CSS: [
        'ferro-26', 'ferro-28', 'ferro-30', 'ferro-32', 'ferro-41',
        'bronze-4', 'bronze-6', 'bronze-19', 'bronze-23', 'bronze-25', 'bronze-28',
        'bronze-55', 'bronze-56', 'bronze-57', 'bronze-58',
    ],
    JS: [
        'prata-2', 'prata-4', 'prata-7', 'prata-9', 'prata-11', 'prata-13',
        'prata-15', 'prata-17', 'prata-20', 'prata-24', 'prata-35',
    ],
};

export function getCodeQuestExerciseOptionsForTask(taskId: string): CodeQuestExerciseDef[] {
    return CODEQUEST_TASK_EXERCISES[taskId] ?? [];
}

export function getCodeQuestSlugsForTask(taskId: string): string[] {
    return getCodeQuestExerciseOptionsForTask(taskId).map((exercise) => exercise.slug);
}

export function isMultiExerciseTask(taskId: string): boolean {
    return getCodeQuestExerciseOptionsForTask(taskId).length > 1;
}

export function getTaskIdForCodeQuestSlug(slug: string): string | undefined {
    return CODEQUEST_EXERCISE_TASK_IDS[slug];
}

/** Tarefa concluída no CodeQuest quando todos os slugs mapeados foram feitos. */
export function isTaskCompleteInCodeQuest(taskId: string, completedExerciseIds: string[]): boolean {
    const exercises = getCodeQuestExerciseOptionsForTask(taskId);
    if (exercises.length === 0) {
        return false;
    }

    const completed = new Set(completedExerciseIds);
    return exercises.every((exercise) => completed.has(exercise.slug));
}

export function getTaskIdsReadyToSyncFromCodeQuest(completedExerciseIds: string[]): string[] {
    return Object.keys(CODEQUEST_TASK_EXERCISES).filter((taskId) =>
        isTaskCompleteInCodeQuest(taskId, completedExerciseIds),
    );
}
