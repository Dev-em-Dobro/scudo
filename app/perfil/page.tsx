import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import Header from '@/app/components/layout/Header';
import Sidebar from '@/app/components/layout/Sidebar';
import ChangePasswordSection from '@/app/components/profile/ChangePasswordSection';
import ProfileEditor from '@/app/components/profile/ProfileEditor';
import { auth } from '@/app/lib/auth';
import { getOrCreateUserProfile, toClientProfile } from '@/app/lib/profile/profile';

function SectionBlock({
    title,
    icon,
    iconColor,
    children,
}: Readonly<{ title: string; icon: string; iconColor: string; children: React.ReactNode }>) {
    return (
        <section className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
                <span
                    className={`material-symbols-outlined ${iconColor}`}
                    style={{ fontSize: '18px', fontVariationSettings: "'FILL' 1" }}
                >
                    {icon}
                </span>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h2>
            </div>
            {children}
        </section>
    );
}

function TagList({ values, emptyLabel }: Readonly<{ values: string[]; emptyLabel?: string }>) {
    if (values.length === 0) {
        return (
            <p className="text-sm text-slate-400 dark:text-slate-300">
                {emptyLabel ?? 'Sem informações cadastradas.'}
            </p>
        );
    }

    return (
        <div className="flex flex-wrap gap-2">
            {values.map((value) => (
                <span
                    key={value}
                    className="inline-flex items-center px-2.5 py-1 text-xs font-mono font-medium text-slate-500 dark:text-slate-200 bg-slate-100 dark:bg-background-dark border border-slate-200 dark:border-border-dark rounded-lg"
                >
                    {value}
                </span>
            ))}
        </div>
    );
}

function SkillTagList({ values }: Readonly<{ values: string[] }>) {
    if (values.length === 0) {
        return <p className="text-sm text-slate-400 dark:text-slate-300">Nenhuma stack cadastrada ainda.</p>;
    }

    return (
        <div className="flex flex-wrap gap-2">
            {values.map((value) => (
                <span
                    key={value}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-mono font-bold text-primary bg-primary/10 border border-primary/20 rounded-lg uppercase"
                >
                    <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '11px', fontVariationSettings: "'FILL' 1" }}
                    >
                        check_circle
                    </span>
                    {value}
                </span>
            ))}
        </div>
    );
}

function ProjectCard({
    project,
}: Readonly<{
    project: {
        id: string;
        title: string;
        shortDescription: string | null;
        technologies: string[];
        deployUrl: string | null;
    };
}>) {
    return (
        <article className="border border-border-light dark:border-border-dark rounded-xl p-4 bg-slate-50 dark:bg-background-dark space-y-3 hover:border-primary/30 transition-colors">
            <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-bold text-white">{project.title}</p>
                {project.deployUrl ? (
                    <a
                        href={project.deployUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/10 transition-colors"
                    >
                        <span
                            className="material-symbols-outlined"
                            style={{ fontSize: '12px', fontVariationSettings: "'FILL' 1" }}
                        >
                            open_in_new
                        </span>
                        {" "}Deploy
                    </a>
                ) : (
                    <span
                        className="shrink-0 inline-flex items-center px-2 py-0.5 text-xs font-medium text-slate-300 border border-border-dark rounded-lg">
                        Sem deploy
                    </span>
                )}
            </div>

            {project.shortDescription && (
                <p className="text-xs text-slate-400 dark:text-slate-300 leading-relaxed">
                    {project.shortDescription}
                </p>
            )}

            {project.technologies.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {project.technologies.map((tech) => (
                        <span
                            key={`${project.id}-${tech}`}
                            className="inline-flex items-center px-2 py-0.5 text-xs font-mono font-medium text-slate-500 dark:text-slate-200 bg-white dark:bg-surface-dark border border-slate-200 dark:border-border-dark rounded"
                        >
                            {tech}
                        </span>
                    ))}
                </div>
            )}
        </article>
    );
}

function PersonalDataRow({ icon, label, value }: Readonly<{ icon: string; label: string; value: string | null }>) {
    return (
        <div className="flex items-center gap-3 py-2.5 border-b border-border-light dark:border-border-dark last:border-0">
            <span
                className="shrink-0 material-symbols-outlined text-slate-300"
                style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}
            >
                {icon}
            </span>
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-300 uppercase tracking-wide w-20 shrink-0">
                {label}
            </span>
            {value ? (
                <span className="text-sm text-slate-200 truncate">{value}</span>
            ) : (
                <span className="text-sm text-slate-300 dark:text-slate-400 italic">Não informado</span>
            )}
        </div>
    );
}

export default async function PerfilPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
        redirect('/login');
    }

    const profile = await getOrCreateUserProfile({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
    });

    const clientProfile = toClientProfile(profile);

    const statCards = [
        {
            key: 'stacks',
            title: 'Stacks',
            value: String(clientProfile.knownTechnologies.length),
            description: 'Tecnologias cadastradas no perfil.',
            icon: 'code',
            iconColor: 'text-primary',
            iconBg: 'bg-primary/10',
        },
        {
            key: 'projects',
            title: 'Projetos',
            value: String(clientProfile.projects.length),
            description: 'Projetos adicionados ao portfólio.',
            icon: 'folder_open',
            iconColor: 'text-blue-400',
            iconBg: 'bg-blue-500/10',
        },
        {
            key: 'certifications',
            title: 'Certificações',
            value: String(clientProfile.certifications.length),
            description: 'Certificações registradas.',
            icon: 'workspace_premium',
            iconColor: 'text-amber-400',
            iconBg: 'bg-amber-500/10',
        },
    ];

    return (
        <div className="min-h-screen flex dark bg-background-light dark:bg-background-dark text-white font-sans antialiased">
            <Sidebar />

            <main className="flex-1 flex flex-col min-w-0 overflow-visible lg:overflow-hidden bg-background-light dark:bg-background-dark">
                <Header title="Meu Perfil" />

                <div className="flex-1 overflow-visible lg:overflow-auto p-6 md:p-8 space-y-6 scrollbar-modern">

                    {/* Editor interativo */}
                    <ProfileEditor initialProfile={clientProfile} />

                    {/* Segurança da conta */}
                    <ChangePasswordSection />

                    {/* Stat cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {statCards.map((card) => (
                            <div
                                key={card.key}
                                className="bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-xl p-5 flex items-start gap-4"
                            >
                                <div className={`shrink-0 w-10 h-10 rounded-lg ${card.iconBg} flex items-center justify-center`}>
                                    <span
                                        className={`material-symbols-outlined ${card.iconColor}`}
                                        style={{ fontSize: '20px', fontVariationSettings: "'FILL' 1" }}
                                    >
                                        {card.icon}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-300 uppercase tracking-wide">{card.title}</p>
                                    <p className="text-2xl font-bold text-white mt-0.5">{card.value}</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-300 mt-1">{card.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Dados Pessoais */}
                    <SectionBlock title="Dados Pessoais" icon="person" iconColor="text-primary">
                        <PersonalDataRow icon="badge" label="Nome" value={clientProfile.fullName} />
                        <PersonalDataRow icon="location_on" label="Cidade" value={clientProfile.city} />
                        <PersonalDataRow icon="work" label="LinkedIn" value={clientProfile.linkedinUrl} />
                        <PersonalDataRow icon="code" label="GitHub" value={clientProfile.githubUrl} />
                    </SectionBlock>

                    {/* Resumo Profissional */}
                    <SectionBlock title="Resumo Profissional" icon="description" iconColor="text-blue-400">
                        {clientProfile.professionalSummary ? (
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                {clientProfile.professionalSummary}
                            </p>
                        ) : (
                            <div className="flex items-center gap-2 py-3 text-sm text-slate-300 dark:text-slate-400">
                                <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}
                                >
                                    info
                                </span>
                                {" "}Sem resumo extraído até o momento. Faça upload do seu currículo para preencher automaticamente.
                            </div>
                        )}
                    </SectionBlock>

                    {/* Stacks Conhecidas */}
                    <SectionBlock title="Stacks Conhecidas" icon="integration_instructions" iconColor="text-primary">
                        <SkillTagList values={clientProfile.knownTechnologies} />
                    </SectionBlock>

                    {/* Experiências */}
                    <SectionBlock title="Experiências" icon="history_edu" iconColor="text-blue-400">
                        {clientProfile.experiences.length === 0 ? (
                            <p className="text-sm text-slate-400 dark:text-slate-300">Sem experiências cadastradas.</p>
                        ) : (
                            <ul className="space-y-2">
                                {clientProfile.experiences.map((exp) => (
                                    <li
                                        key={exp}
                                        className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300"
                                    >
                                        <span
                                            className="material-symbols-outlined text-primary shrink-0 mt-0.5"
                                            style={{ fontSize: '14px', fontVariationSettings: "'FILL' 1" }}
                                        >
                                            chevron_right
                                        </span>
                                        {exp}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </SectionBlock>

                    {/* Projetos */}
                    <SectionBlock title="Projetos" icon="folder_open" iconColor="text-blue-400">
                        {clientProfile.projects.length === 0 ? (
                            <div className="flex flex-col items-center gap-3 py-8 text-center">
                                <span
                                    className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-500"
                                    style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                    folder_open
                                </span>
                                <p className="text-sm font-medium text-slate-400 dark:text-slate-300">Nenhum projeto cadastrado ainda.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {clientProfile.projects.map((project) => (
                                    <ProjectCard key={project.id} project={project} />
                                ))}
                            </div>
                        )}
                    </SectionBlock>

                    {/* Certificações e Idiomas lado a lado */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SectionBlock title="Certificações" icon="workspace_premium" iconColor="text-amber-400">
                            <TagList
                                values={clientProfile.certifications}
                                emptyLabel="Sem certificações cadastradas."
                            />
                        </SectionBlock>

                        <SectionBlock title="Idiomas" icon="translate" iconColor="text-blue-400">
                            <TagList
                                values={clientProfile.languages}
                                emptyLabel="Sem idiomas cadastrados."
                            />
                        </SectionBlock>
                    </div>

                </div>
            </main>
        </div>
    );
}
