const TECH_STACK_DICTIONARY = [
    'javascript',
    'typescript',
    'react',
    'next',
    'node',
    'express',
    'nestjs',
    'python',
    'java',
    'c#',
    '.net',
    'go',
    'rust',
    'sql',
    'postgresql',
    'mysql',
    'mongodb',
    'aws',
    'azure',
    'docker',
    'kubernetes',
    'terraform',
    'graphql',
    'tailwind',
    'html',
    'css',
    'git',
    'linux',
];

const LANGUAGE_CANONICAL_MAP: Record<string, string> = {
    portugues: 'Português',
    ingles: 'Inglês',
    espanhol: 'Espanhol',
    frances: 'Francês',
    alemao: 'Alemão',
};

const LANGUAGE_KEYS = Object.keys(LANGUAGE_CANONICAL_MAP);

const LANGUAGE_LEVEL_CANONICAL_MAP: Record<string, string> = {
    nativo: 'Nativo',
    fluent: 'Fluente',
    fluente: 'Fluente',
    avancado: 'Avançado',
    advanced: 'Avançado',
    intermediario: 'Intermediário',
    intermediate: 'Intermediário',
    basico: 'Básico',
    basic: 'Básico',
};

const BRAZIL_STATE_CODES = new Set([
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
    'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
    'SP', 'SE', 'TO',
]);

const BRAZIL_STATE_NAME_TO_CODE: Record<string, string> = {
    acre: 'AC',
    alagoas: 'AL',
    amapa: 'AP',
    amazonas: 'AM',
    bahia: 'BA',
    ceara: 'CE',
    'distrito federal': 'DF',
    espirito_santo: 'ES',
    goias: 'GO',
    maranhao: 'MA',
    mato_grosso: 'MT',
    'mato grosso do sul': 'MS',
    minas_gerais: 'MG',
    para: 'PA',
    paraiba: 'PB',
    parana: 'PR',
    pernambuco: 'PE',
    piaui: 'PI',
    rio_de_janeiro: 'RJ',
    rio_grande_do_norte: 'RN',
    rio_grande_do_sul: 'RS',
    rondonia: 'RO',
    roraima: 'RR',
    santa_catarina: 'SC',
    sao_paulo: 'SP',
    sergipe: 'SE',
    tocantins: 'TO',
};

const HEADING_TRANSLATIONS: Record<string, string> = {
    contact: 'contato',
    contacts: 'contato',
    contato: 'contato',
    summary: 'resumo',
    about: 'resumo',
    'about me': 'resumo',
    'professional summary': 'resumo',
    resumo: 'resumo',
    'resumo profissional': 'resumo',
    'sobre mim': 'resumo',
    experience: 'experiencia',
    experiences: 'experiencia',
    'work experience': 'experiencia',
    'professional experience': 'experiencia',
    'professional experiences': 'experiencia',
    experiência: 'experiencia',
    'experiência profissional': 'experiencia',
    experiências: 'experiencia',
    'experiências profissionais': 'experiencia',
    'experiencia profissional': 'experiencia',
    'experiencias profissionais': 'experiencia',
    skills: 'habilidades',
    'technical skills': 'habilidades',
    habilidades: 'habilidades',
    projects: 'projetos',
    project: 'projetos',
    projetos: 'projetos',
    education: 'formacao',
    formação: 'formacao',
    formacao: 'formacao',
    certifications: 'certificacao',
    certification: 'certificacao',
    certificações: 'certificacao',
    certificacao: 'certificacao',
    languages: 'idiomas',
    language: 'idiomas',
    idiomas: 'idiomas',
    idioma: 'idiomas',
};

export type ExtractedResumeData = {
    fullName: string | null;
    linkedinUrl: string | null;
    githubUrl: string | null;
    city: string | null;
    professionalSummary: string | null;
    experiences: string[];
    knownTechnologies: string[];
    projects: {
        title: string;
        shortDescription: string | null;
        technologies: string[];
        deployUrl: string | null;
    }[];
    certifications: string[];
    languages: string[];
};

export type ResumeSourceHint = 'generic' | 'linkedin-export';

export type ResumeExtractionQuality = {
    score: number;
    isReliable: boolean;
    missingFields: string[];
};

function normalizeLine(line: string) {
    return line.trim().split(/\s+/).join(' ');
}

function normalizeAscii(value: string) {
    return value
        .normalize('NFD')
        .replaceAll(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

const PROJECT_STOP_SECTION_PATTERNS = [
    /^stacks?\s+conhecidas\b/i,
    /^skills?\b/i,
    /^habilidades\b/i,
    /^forma[cç][aã]o\b/i,
    /^idiomas?\b/i,
    /^certifica[cç][aã]o\b/i,
    /^certifica[cç][oõ]es\b/i,
    /^education\b/i,
    /^languages?\b/i,
    /^certifications?\b/i,
    /^summary\b/i,
    /^experience\b/i,
];

function normalizeHeadingToken(line: string) {
    const cleaned = normalizeLine(line)
        .toLowerCase()
        .replace(/^[-•]\s*/, '')
        .replace(/[:\-–]+$/, '')
        .trim();

    return HEADING_TRANSLATIONS[cleaned] ?? cleaned;
}

function countWords(value: string) {
    return normalizeLine(value).split(' ').filter(Boolean).length;
}

function isKnownSectionHeading(line: string) {
    const normalized = normalizeHeadingToken(line);
    return /^(contato|resumo|experiencia|certificacao|idiomas|formacao|habilidades|projetos)$/.test(normalized);
}

function pickFullName(lines: string[]) {
    return lines
        .slice(0, 8)
        .map(normalizeLine)
        .find((line) => {
            const isNamePattern = /^[A-ZÀ-Ý][A-Za-zÀ-ÿ'-]+(?:\s+[A-ZÀ-Ý][A-Za-zÀ-ÿ'-]+){1,3}$/.test(line);
            const isHeaderNoise = isKnownSectionHeading(line)
                || /curr[ií]culo|resume|linkedin|github|email|e-mail|telefone|phone|contact|skills|experience|education|languages|certifications?|projects?/i.test(line);
            return isNamePattern && !isHeaderNoise;
        }) ?? null;
}

function pickSection(lines: string[], startMatchers: RegExp[], maxItems = 6) {
    const startIndex = lines.findIndex((line) => startMatchers.some((matcher) => matcher.test(line)));
    if (startIndex < 0) {
        return [];
    }

    const sectionItems: string[] = [];

    for (let index = startIndex + 1; index < lines.length; index += 1) {
        const currentLine = normalizeLine(lines[index]);

        if (!currentLine) {
            if (sectionItems.length > 0) {
                break;
            }
            continue;
        }

        if (isKnownSectionHeading(currentLine)) {
            if (sectionItems.length > 0) {
                break;
            }
            continue;
        }

        sectionItems.push(currentLine.replace(/^[-•]\s*/, ''));

        if (sectionItems.length >= maxItems) {
            break;
        }
    }

    return sectionItems;
}

function uniqueList(values: string[]) {
    return [...new Set(values.map((value) => normalizeLine(value)).filter(Boolean))];
}

function extractKnownTechnologies(text: string) {
    const normalizedText = text.toLowerCase();

    return uniqueList(
        TECH_STACK_DICTIONARY.filter((keyword) => {
            const escapedKeyword = keyword.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
            const regex = new RegExp(`(^|[^a-z0-9])${escapedKeyword}([^a-z0-9]|$)`, 'i');
            return regex.test(normalizedText);
        }),
    );
}

function normalizeTechnologyToken(token: string) {
    const cleaned = normalizeLine(token)
        .replaceAll(/[()]/g, '')
        .replaceAll(/\s+/g, ' ')
        .toLowerCase();

    const aliases: Record<string, string> = {
        'node.js': 'node',
        'node js': 'node',
        'next.js': 'next',
        'next js': 'next',
        'tailwind css': 'tailwind',
        'html5': 'html',
        'css3': 'css',
        'javascript es6': 'javascript',
        'javascript es 6': 'javascript',
    };

    const fromAlias = aliases[cleaned];
    if (fromAlias) {
        return fromAlias;
    }

    return cleaned;
}

function isProjectMetadataLine(line: string) {
    const normalized = normalizeLine(line);
    return /^(reposit[oó]rio|repository|github|deploy|demo|url|link)\s*:/i.test(normalized)
        || /github\.com\//i.test(normalized)
        || /vercel\.app|netlify\.app|onrender\.com|herokuapp\.com|fly\.dev/i.test(normalized);
}

function sanitizeProjectUrl(value: string) {
    return value.replaceAll(/[)\].,;]+$/g, '').trim();
}

function parseProjectMetadataLink(line: string) {
    const match = /^(reposit[oó]rio|repository|github|deploy|demo|url|link)\s*:\s*(https?:\/\/\S+)/i.exec(line);
    if (!match) {
        return null;
    }

    const label = normalizeAscii(match[1] ?? '');
    const url = sanitizeProjectUrl(match[2] ?? '');
    return url ? { label, url } : null;
}

function parsePlainProjectUrl(line: string) {
    const match = /^(https?:\/\/\S+)$/i.exec(line);
    if (!match) {
        return null;
    }

    const url = sanitizeProjectUrl(match[1] ?? '');
    return url || null;
}

function isDeployLikeProjectLink(label: string, url: string) {
    return /deploy|demo/.test(label)
        || /vercel\.app|netlify\.app|onrender\.com|herokuapp\.com|fly\.dev/i.test(url);
}

// SONAR: heurística de parsing textual com múltiplos formatos de currículo; refatorar para pipeline modular em tarefa dedicada.
function extractProjects(lines: string[]) {
    const projectSectionIndex = lines.findIndex((line) => /^(projetos|projects?|portfolio)\b/i.test(line));
    if (projectSectionIndex < 0) {
        return [];
    }

    const projectLines: string[] = [];
    for (let index = projectSectionIndex + 1; index < lines.length; index += 1) {
        const currentLine = normalizeLine(lines[index]).replace(/^[-•]\s*/, '');

        if (!currentLine || /^--\s*\d+\s*of\s*\d+\s*--$/i.test(currentLine)) {
            continue;
        }

        if (PROJECT_STOP_SECTION_PATTERNS.some((pattern) => pattern.test(currentLine))) {
            break;
        }

        projectLines.push(currentLine);
    }

    const projects: {
        title: string;
        shortDescription: string | null;
        technologies: string[];
        deployUrl: string | null;
    }[] = [];

    let currentTitle: string | null = null;
    let currentDescriptionParts: string[] = [];
    let currentTechnologies: string[] = [];
    let currentDeployUrl: string | null = null;

    const isLikelyProjectTitleLine = (line: string) => {
        const normalized = normalizeLine(line).replace(/^[-•]\s*/, '');
        if (!normalized) {
            return false;
        }

        if (/^https?:\/\//i.test(normalized)) {
            return false;
        }

        if (isProjectMetadataLine(normalized) || /https?:\/\//i.test(normalized)) {
            return false;
        }

        if (/^tech\s*stacks?\s*:/i.test(normalized)) {
            return false;
        }

        if (/^(projeto|project)\s*[:-]?\s*/i.test(normalized)) {
            return true;
        }

        const words = countWords(normalized);
        const hasSentencePunctuation = /[.!?]$/.test(normalized);
        const hasComma = normalized.includes(',');

        return words >= 1
            && words <= 10
            && normalized.length <= 90
            && !hasSentencePunctuation
            && !hasComma;
    };

    const flushProject = () => {
        if (!currentTitle) {
            return;
        }

        const shortDescription = currentDescriptionParts.length > 0 ? currentDescriptionParts.join(' ') : null;
        const normalizedTechnologies = uniqueList(currentTechnologies.map(normalizeTechnologyToken));
        const fallbackTechnologies = normalizedTechnologies.length > 0
            ? normalizedTechnologies
            : extractKnownTechnologies(`${currentTitle} ${shortDescription ?? ''}`);

        projects.push({
            title: currentTitle,
            shortDescription,
            technologies: fallbackTechnologies,
            deployUrl: currentDeployUrl,
        });

        currentTitle = null;
        currentDescriptionParts = [];
        currentTechnologies = [];
        currentDeployUrl = null;
    };

    for (const line of projectLines) {
        const metadata = parseProjectMetadataLink(line);
        if (metadata && currentTitle) {
            if (isDeployLikeProjectLink(metadata.label, metadata.url)) {
                currentDeployUrl = metadata.url;
            }
            currentDescriptionParts.push(line);
            continue;
        }

        const plainUrl = parsePlainProjectUrl(line);
        if (plainUrl && currentTitle) {
            if (!currentDeployUrl) {
                currentDeployUrl = plainUrl;
            }
            currentDescriptionParts.push(line);
            continue;
        }

        const techLineMatch = /^tech\s*stacks?\s*:\s*(.+)$/i.exec(line);

        if (techLineMatch) {
            currentTechnologies = techLineMatch[1]
                .split(',')
                .map((item) => normalizeTechnologyToken(item))
                .filter(Boolean);
            if (currentTitle) {
                flushProject();
            }
            continue;
        }

        if (!currentTitle) {
            currentTitle = line;
            continue;
        }

        if (currentDescriptionParts.length > 0 && isLikelyProjectTitleLine(line)) {
            flushProject();
            currentTitle = line;
            continue;
        }

        currentDescriptionParts.push(line);
    }

    flushProject();

    return projects;
}

function deriveKnownTechnologiesFromProjects(projects: { technologies: string[] }[]) {
    return uniqueList(projects.flatMap((project) => project.technologies).map(normalizeTechnologyToken));
}

function extractLanguages(text: string, sectionValues: string[]) {
    const isInvalidLanguageEntry = (value: string) => {
        const normalized = normalizeAscii(value);
        return /experien|profission|projet|atividad|freelancer|empresa|resumo|habilidade|tecnolog|certifica|formacao/.test(normalized);
    };

    const canonicalizeLanguageEntry = (value: string) => {
        const cleaned = normalizeLine(value).replace(/^[-•]\s*/, '');
        if (!cleaned || isInvalidLanguageEntry(cleaned)) {
            return null;
        }

        const normalized = normalizeAscii(cleaned);
        const languageKey = LANGUAGE_KEYS.find((key) => new RegExp(String.raw`\b${key}\b`).exec(normalized));

        if (!languageKey) {
            return null;
        }

        const languageName = LANGUAGE_CANONICAL_MAP[languageKey];
        const levelMatch = /\b(nativo|fluente|fluent|avancado|advanced|intermediario|intermediate|basico|basic)\b/.exec(normalized);

        if (!levelMatch) {
            return languageName;
        }

        const canonicalLevel = LANGUAGE_LEVEL_CANONICAL_MAP[levelMatch[1]];
        return canonicalLevel ? `${languageName} - ${canonicalLevel}` : languageName;
    };

    const fromSection = sectionValues
        .flatMap((value) => value.split(/[|;,]/))
        .map((value) => canonicalizeLanguageEntry(value))
        .filter((value): value is string => value !== null);

    const fromText: string[] = [];
    const normalizedLines = text
        .split(/\r?\n/)
        .map((line) => normalizeAscii(line))
        .filter(Boolean);

    for (const line of normalizedLines) {
        if (isInvalidLanguageEntry(line)) {
            continue;
        }

        const languageKey = LANGUAGE_KEYS.find((key) => new RegExp(String.raw`\b${key}\b`).exec(line));
        if (!languageKey) {
            continue;
        }

        const levelMatch = /\b(nativo|fluente|fluent|avancado|advanced|intermediario|intermediate|basico|basic)\b/.exec(line);
        const level = levelMatch?.[1] ? LANGUAGE_LEVEL_CANONICAL_MAP[levelMatch[1]] : null;
        const languageName = LANGUAGE_CANONICAL_MAP[languageKey];

        fromText.push(level ? `${languageName} - ${level}` : languageName);
    }

    return uniqueList([...fromSection, ...fromText]);
}

// SONAR: heurística de extração de cidade contempla variações de layout e localização; modularizar em tarefa dedicada.
function extractCity(lines: string[]) {
    const hasInvalidCityToken = (value: string) => {
        const lowered = value.toLowerCase();
        return /desenvolvedor|developer|fullstack|frontend|backend|ux|ui|design|designer|software|react|node|typescript|javascript|engenheiro|tech|stack/.test(lowered);
    };

    const parseStateCode = (stateValue: string) => {
        const upper = stateValue.toUpperCase().trim();
        if (BRAZIL_STATE_CODES.has(upper)) {
            return upper;
        }

        const normalized = normalizeAscii(stateValue)
            .replaceAll('-', ' ')
            .replaceAll(/\s+/g, '_');

        return BRAZIL_STATE_NAME_TO_CODE[normalized] ?? null;
    };

    const sanitizeCityCandidate = (cityValue: string, stateValue: string) => {
        const city = normalizeLine(cityValue);
        const state = parseStateCode(stateValue ?? '');

        if (!city || !state) {
            return null;
        }

        if (city.length > 50 || /\d/.test(city) || hasInvalidCityToken(city)) {
            return null;
        }

        return `${city} - ${state}`;
    };

    const lineWithCityLabel = lines.find((line) => /^(cidade|localiza[cç][aã]o)\s*:/i.test(line));
    if (lineWithCityLabel) {
        const afterLabel = normalizeLine(lineWithCityLabel.split(':').slice(1).join(':'));
        if (!afterLabel || hasInvalidCityToken(afterLabel)) {
            return null;
        }

        const cityWithStateMatch = /^(.*?)\s*[,\-/–]\s*([A-Za-zÀ-ÿ\s]{2,30})$/.exec(afterLabel);
        if (cityWithStateMatch) {
            const sanitizedLabeledCity = sanitizeCityCandidate(cityWithStateMatch[1] ?? '', cityWithStateMatch[2] ?? '');
            if (sanitizedLabeledCity) {
                return sanitizedLabeledCity;
            }
        }

        return afterLabel;
    }

    const cityPatternCandidates = [
        /([A-Za-zÀ-ÿ\s]{2,40})\s*,\s*([A-Za-zÀ-ÿ\s]{4,30})\s*$/,
        /([A-Za-zÀ-ÿ\s]{2,40})\s*[-–]\s*([A-Za-zÀ-ÿ\s]{4,30})\s*$/,
        /([A-Za-zÀ-ÿ\s]{2,40})\s*\/\s*([A-Za-zÀ-ÿ\s]{4,30})\s*$/,
        /([A-Za-zÀ-ÿ\s]{2,40})\s*,\s*([A-Z]{2})\s*$/,
        /([A-Za-zÀ-ÿ\s]{2,40})\s*[-–]\s*([A-Z]{2})\s*$/,
        /([A-Za-zÀ-ÿ\s]{2,40})\s*\/\s*([A-Z]{2})\s*$/,
        /\b([A-Za-zÀ-ÿ\s]{2,40})\s*[-–]\s*([A-Z]{2})\b/,
        /\b([A-Za-zÀ-ÿ\s]{2,40})\s*\/\s*([A-Z]{2})\b/,
        /\b([A-Za-zÀ-ÿ\s]{2,40})\s*,\s*([A-Z]{2})\b/,
        /\b([A-Za-zÀ-ÿ\s]{2,40})\s*[-–]\s*([A-Za-zÀ-ÿ\s]{4,30})\b/,
        /\b([A-Za-zÀ-ÿ\s]{2,40})\s*\/\s*([A-Za-zÀ-ÿ\s]{4,30})\b/,
        /\b([A-Za-zÀ-ÿ\s]{2,40})\s*,\s*([A-Za-zÀ-ÿ\s]{4,30})\b/,
    ];

    const candidateLines = lines.slice(0, 20);

    for (const line of candidateLines) {
        if (line.split(',').length > 5) {
            continue;
        }

        for (const pattern of cityPatternCandidates) {
            const match = pattern.exec(line);
            if (!match) {
                continue;
            }

            const sanitizedCity = sanitizeCityCandidate(match[1] ?? '', match[2] ?? '');
            if (sanitizedCity) {
                return sanitizedCity;
            }
        }
    }

    return null;
}

function normalizeExtractedUrl(url: string) {
    const trimmed = normalizeLine(url);
    if (/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }
    return `https://${trimmed}`;
}

function extractLinkedinUrl(rawText: string) {
    const match = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[\w\-./?=&%]+/i.exec(rawText);
    return match?.[0] ? normalizeExtractedUrl(match[0]) : null;
}

function extractGithubUrl(rawText: string) {
    const match = /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w\-./?=&%]+/i.exec(rawText);
    return match?.[0] ? normalizeExtractedUrl(match[0]) : null;
}

function detectResumeSourceHint(rawText: string): ResumeSourceHint {
    const linkedinPatterns = [
        /linkedin\.com\/in\//i,
        /(?:perfil|profile)\s+do\s+linkedin/i,
        /^linkedin$/im,
    ];

    const hasLinkedinFingerprint = linkedinPatterns.some((pattern) => pattern.test(rawText));
    return hasLinkedinFingerprint ? 'linkedin-export' : 'generic';
}

function normalizeLinkedinExportText(rawText: string) {
    return rawText
        .replaceAll('\r', '')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => !/^p[aá]gina\s+\d+\s+de\s+\d+$/i.test(line))
        .filter((line) => !/^page\s+\d+\s+of\s+\d+$/i.test(line))
        .filter((line) => line.toLowerCase() !== 'linkedin')
        .join('\n');
}

export function normalizeResumeInputText(rawText: string, sourceHintOverride?: ResumeSourceHint) {
    const sourceHint = sourceHintOverride ?? detectResumeSourceHint(rawText);

    if (sourceHint === 'linkedin-export') {
        return {
            sourceHint,
            text: normalizeLinkedinExportText(rawText),
        };
    }

    return {
        sourceHint,
        text: rawText,
    };
}

export function evaluateResumeExtractionQuality(extracted: ExtractedResumeData, sourceHint: ResumeSourceHint = 'generic'): ResumeExtractionQuality {
    let score = 0;
    const missingFields: string[] = [];

    if (extracted.fullName) {
        score += 0.15;
    } else {
        missingFields.push('nome');
    }

    if (extracted.professionalSummary) {
        score += 0.1;
    } else {
        missingFields.push('resumo');
    }

    if (extracted.experiences.length > 0) {
        score += 0.2;
    } else {
        missingFields.push('experiências');
    }

    if (extracted.projects.length > 0) {
        score += 0.2;
    } else {
        missingFields.push('projetos');
    }

    if (extracted.knownTechnologies.length >= 2) {
        score += 0.2;
    } else {
        missingFields.push('tecnologias');
    }

    if (extracted.linkedinUrl || extracted.githubUrl || extracted.city) {
        score += 0.1;
    } else {
        missingFields.push('contato/localização');
    }

    if (extracted.languages.length > 0 || extracted.certifications.length > 0) {
        score += 0.05;
    }

    const roundedScore = Math.min(1, Math.max(0, Number(score.toFixed(2))));
    const reliabilityThreshold = sourceHint === 'linkedin-export' ? 0.3 : 0.4;
    const isReliable = roundedScore >= reliabilityThreshold;

    return {
        score: roundedScore,
        isReliable,
        missingFields,
    };
}

export function extractResumeDataFromText(rawText: string): ExtractedResumeData {
    const lines = rawText
        .split(/\r?\n/)
        .map(normalizeLine)
        .filter(Boolean);

    const summaryLines = pickSection(lines, [/^resumo\b/i, /^resumo profissional\b/i, /^sobre mim\b/i, /^summary\b/i, /^about\b/i], 4);
    const experienceLines = pickSection(lines, [/^experi[eê]ncia\b/i, /^experi[eê]ncias\b/i, /^experience\b/i], 8);
    const certificationLines = pickSection(lines, [/^certifica[cç][aã]o\b/i, /^certifica[cç][oõ]es\b/i, /^certification\b/i, /^certifications\b/i], 8);
    const languageSectionLines = pickSection(lines, [/^idioma\b/i, /^idiomas\b/i, /^languages\b/i, /^language\b/i], 6);
    const projects = extractProjects(lines);
    const knownTechnologies = projects.length > 0
        ? deriveKnownTechnologiesFromProjects(projects)
        : extractKnownTechnologies(rawText);

    return {
        fullName: pickFullName(lines),
        linkedinUrl: extractLinkedinUrl(rawText),
        githubUrl: extractGithubUrl(rawText),
        city: extractCity(lines),
        professionalSummary: summaryLines.length > 0 ? summaryLines.join(' ') : null,
        experiences: uniqueList(experienceLines),
        knownTechnologies,
        projects,
        certifications: uniqueList(certificationLines),
        languages: extractLanguages(rawText, languageSectionLines),
    };
}
