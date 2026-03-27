export function extractSkillsSectionFromText(description: string) {
    const normalized = description.replace(/\s+/g, ' ').trim();
    if (!normalized) {
        return '';
    }

    const lower = normalized.toLowerCase();

    const startKeywords = [
        // PT
        'habilidades',
        'requisitos',
        'qualificações',
        'qualificacoes',
        'o que buscamos',
        'o que voce precisa',
        'o que você precisa',
        'o que esperamos',
        'o que você vai fazer',
        'o que voce vai fazer',
        // EN
        'skills',
        'requirements',
        'qualifications',
        'what you bring',
        'what we are looking for',
    ];

    const endKeywords = [
        // PT
        'benefícios',
        'beneficios',
        // EN
        'benefits',
        'about the role',
        'perks',
    ];

    let startIndex = -1;
    for (const kw of startKeywords) {
        const idx = lower.indexOf(kw);
        if (idx !== -1 && (startIndex === -1 || idx < startIndex)) {
            startIndex = idx;
        }
    }

    // Sem marcador claro, devolve início limitado (melhor do que o documento inteiro).
    if (startIndex === -1) {
        return normalized.slice(0, 8000);
    }

    let endIndex = normalized.length;
    const afterStart = lower.slice(startIndex);
    for (const kw of endKeywords) {
        const rel = afterStart.indexOf(kw);
        if (rel !== -1) {
            const abs = startIndex + rel;
            if (abs < endIndex) {
                endIndex = abs;
            }
        }
    }

    return normalized.slice(startIndex, endIndex).slice(0, 8000);
}

