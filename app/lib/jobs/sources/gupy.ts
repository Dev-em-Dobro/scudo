import { RawSourceJob } from '../types';
import { fetchAndExtractJobDescription } from '../sourceDescription';

/**
 * Conector para o portal Gupy
 * https://portal.gupy.io/job-search/sortBy=publishedDate
 * 
 * Estratégia:
 * - Buscar vagas recentes ordenadas por data
 * - Filtrar por palavras-chave de tech/dev
 * - Extrair apenas metadados (sem descrição completa)
 */

interface GupyJobData {
    id: string;
    name: string;
    publishedDate: string;
    applicationDeadline?: string;
    isRemoteWork: boolean;
    country: string;
    state?: string;
    city?: string;
    careerPageName: string;
    careerPageId: number;
    careerPageLogo?: string;
    jobUrl: string;
    type?: string; // "Efetivo CLT", "Estágio", etc.
}

interface GupyApiResponse {
    data: GupyJobData[];
    pagination: {
        total: number;
        page: number;
        pageSize: number;
    };
}

// Palavras-chave para identificar vagas de tecnologia/desenvolvimento
const TECH_KEYWORDS = [
    // Linguagens alvo
    'javascript', 'typescript', 'python',

    // Frameworks/Libs alvo
    'react', 'next', 'node', 'express', 'nestjs',

    // Roles (foco em júnior/mid-level)
    'desenvolvedor', 'developer', 'engenheiro de software', 'software engineer', 'programador', 'programmer',
    'frontend', 'front-end', 'backend', 'back-end', 'fullstack', 'full-stack', 'full stack',
    'mobile', 'ios', 'android', 'web', 'devops', 'sre', 'platform engineer',

    // Tipos de vaga
    'qa', 'quality assurance', 'test', 'tester',

    // Tecnologias
    'api', 'cloud', 'aws', 'azure', 'gcp', 'kubernetes', 'docker', 'microservices', 'database'
];

// Palavras que indicam stack fora do foco (EXCLUIR)
const NON_TARGET_STACK_KEYWORDS = [
    '.net', 'dotnet', 'asp.net', 'c#',
    'java', 'kotlin', 'spring',
    'php', 'laravel',
    'ruby', 'rails',
    'go', 'golang',
    'rust', 'c++', 'swift',
    'android', 'ios',
    'delphi',
];

// Palavras para EXCLUIR (não são vagas de tech)
const EXCLUDE_KEYWORDS = [
    'vendas', 'sales', 'comercial', 'marketing', 'design gráfico', 'ux designer', 'ui designer',
    'recursos humanos', 'rh', 'human resources', 'financeiro', 'finance', 'contabil', 'accounting',
    'jurídico', 'legal', 'advogado', 'lawyer', 'administrativo', 'administrative', 'recepção', 'reception',
    'atendimento', 'customer service', 'suporte ao cliente', 'operações', 'operations', 'logística', 'logistics'
];

// Palavras que indicam nível sênior ou acima (EXCLUIR - foco em júnior/estágio/pleno)
const SENIOR_KEYWORDS = [
    'sênior', 'senior', 'sénior',
    'sr.', 'sr ', ' sr', 'sr)', '(sr',
    'tech lead', 'technical lead', 'lead developer', 'lead engineer', 'team lead',
    'engineering manager', 'gerente de engenharia', 'gerente engenharia',
    'head of', 'diretor', 'director', 'diretora',
    'principal', 'staff engineer', 'architect', 'arquiteto', 'arquiteta',
    'coordenador', 'coordenadora', 'coordinator'
];

/**
 * Verifica se uma vaga é relacionada a tech com base em palavras-chave
 */
function isTechJob(jobName: string): boolean {
        const nameLower = jobName.toLowerCase();

        // Se contém palavras-chave de exclusão, não é vaga tech
        const hasExcludeKeyword = EXCLUDE_KEYWORDS.some(keyword => nameLower.includes(keyword));
        if (hasExcludeKeyword) {
            return false;
        }

        // Exclui stacks fora do foco (ex.: .NET, C#, Java)
        const hasNonTargetStack = NON_TARGET_STACK_KEYWORDS.some(keyword => nameLower.includes(keyword));
        if (hasNonTargetStack) {
            return false;
        }

        // Exclui vagas de nível sênior ou acima (foco em júnior/estágio/pleno)
        const isSeniorLevel = SENIOR_KEYWORDS.some(keyword => nameLower.includes(keyword));
        if (isSeniorLevel) {
            return false;
        }

        // Se contém palavras-chave tech, é vaga tech
        const hasTechKeyword = TECH_KEYWORDS.some(keyword => nameLower.includes(keyword));
        return hasTechKeyword;
    }

/**
 * Extrai tecnologias/stacks do nome da vaga
 */
function extractStackFromJobName(jobName: string): string[] {
        const stack: string[] = [];
        const nameLower = jobName.toLowerCase();

        // Linguagens alvo
        const languages = ['javascript', 'typescript', 'python'];
        languages.forEach(lang => {
            if (nameLower.includes(lang)) {
                stack.push(lang);
            }
        });

        // Frameworks alvo
        const frameworks = ['react', 'next', 'node', 'express', 'nestjs'];
        frameworks.forEach(fw => {
            if (nameLower.includes(fw)) {
                stack.push(fw);
            }
        });

        // Áreas (frontend, backend, etc.)
        if (nameLower.includes('frontend') || nameLower.includes('front-end')) {
            stack.push('frontend');
        }
        if (nameLower.includes('backend') || nameLower.includes('back-end')) {
            stack.push('backend');
        }
        if (nameLower.includes('fullstack') || nameLower.includes('full-stack') || nameLower.includes('full stack')) {
            stack.push('fullstack');
        }
        if (nameLower.includes('mobile')) {
            stack.push('mobile');
        }
        if (nameLower.includes('devops')) {
            stack.push('devops');
        }

        return [...new Set(stack)]; // Remove duplicatas
    }

/**
 * Termos de busca otimizados para vagas entry-level e mid-level
 * Foco: estágio, júnior e pleno (público-alvo da plataforma)
 */
const SEARCH_TERMS = [
    'desenvolvedor junior',
    'desenvolvedor pleno',
    'estagiario desenvolvedor',
    'estágio desenvolvimento',
    'frontend junior',
    'backend junior',
    'fullstack junior',
    'programador junior',
    'software engineer junior',
    'dev junior',
    'engenheiro de software pleno',
];

/**
 * Busca vagas da Gupy com múltiplas queries focadas em júnior/estágio/pleno
 */
export async function fetchGupyJobs(
    limit: number = 20,
    maxPages: number = 2
): Promise<RawSourceJob[]> {
    const allJobs: RawSourceJob[] = [];
    const seenUrls = new Set<string>(); // Deduplicação por URL

    try {
        // Itera sobre cada termo de busca
        for (const searchTerm of SEARCH_TERMS) {
            console.log(`🔍 [Gupy] Buscando: "${searchTerm}"...`);

            let currentPage = 0;

            while (currentPage < maxPages) {
                const offset = currentPage * limit;
                const encodedTerm = encodeURIComponent(searchTerm);
                const url = `https://employability-portal.gupy.io/api/v1/jobs?jobName=${encodedTerm}&limit=${limit}&offset=${offset}&sortBy=publishedDate`;

                const response = await fetch(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'application/json',
                        'Accept-Language': 'pt-BR,pt;q=0.9',
                    },
                    signal: AbortSignal.timeout(15000)
                });

                if (!response.ok) {
                    console.error(`❌ [Gupy] ${searchTerm} - HTTP ${response.status}`);
                    break;
                }

                const data: GupyApiResponse = await response.json();

                if (!data.data || data.data.length === 0) {
                    break; // Sem mais resultados para este termo
                }

                // Filtra e transforma
                const filteredJobs = data.data
                    .filter(job => {
                        // Deduplica por URL
                        if (seenUrls.has(job.jobUrl)) return false;
                        seenUrls.add(job.jobUrl);

                        // Valida se é vaga tech
                        return isTechJob(job.name);
                    })
                const techJobs = await Promise.all(filteredJobs.map(async (job) => {
                        const location = job.isRemoteWork
                            ? 'Remoto'
                            : [job.city, job.state].filter(Boolean).join(', ') || job.country;
                        const description = await fetchAndExtractJobDescription(job.jobUrl);

                        const rawJob: RawSourceJob = {
                            title: job.name,
                            companyName: job.careerPageName,
                            location,
                            sourceUrl: job.jobUrl,
                            level: job.type || undefined,
                            stack: extractStackFromJobName(job.name),
                            description: description || null,
                            publishedAt: job.publishedDate ? new Date(job.publishedDate) : undefined
                        };

                        return rawJob;
                    }));

                allJobs.push(...techJobs);
                currentPage++;

                // Rate limiting: pausa entre requests
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            console.log(`✅ [Gupy] "${searchTerm}": ${allJobs.length} vagas acumuladas`);

            // Pausa entre termos de busca
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log(`\n🎯 [Gupy] Total final: ${allJobs.length} vagas únicas`);
        return allJobs;

    } catch (error) {
        console.error('❌ [Gupy] Erro no fetchGupyJobs:', error);
        return allJobs; // Retorna o que conseguiu coletar
    }
}

/**
 * Entry point para o bootstrap/ingest pipeline
 * Busca vagas de júnior/estágio/pleno otimizado para o público da plataforma
 */
export async function fetchFromGupy(): Promise<RawSourceJob[]> {
    return fetchGupyJobs(20, 2); // 20 vagas por página, 2 páginas por termo (11 termos = ~440 vagas max)
}
