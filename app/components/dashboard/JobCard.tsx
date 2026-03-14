'use client';

import { Job } from '@/app/types';

interface JobCardProps {
    readonly job: Job;
}

function getJobIcon(jobType: Job['type']): string {
    switch (jobType) {
        case 'match':
            return 'cloud';
        case 'skill-gap':
            return 'deployed_code';
        case 'promoted':
            return 'dataset';
        default:
            return 'work';
    }
}

export default function JobCard({ job }: Readonly<JobCardProps>) {
    const badgeStyles = {
        match: 'bg-green-100 dark:bg-primary/20 text-green-800 dark:text-primary border-green-200 dark:border-primary/30',
        'skill-gap': 'bg-amber-100 dark:bg-secondary/20 text-amber-800 dark:text-secondary border-amber-200 dark:border-secondary/30',
        promoted: 'bg-blue-100 dark:bg-accent/20 text-blue-800 dark:text-accent border-blue-200 dark:border-accent/30',
    };

    const hoverStyles = {
        match: 'hover:border-primary dark:hover:border-primary',
        'skill-gap': 'hover:border-secondary dark:hover:border-secondary',
        promoted: 'hover:border-accent dark:hover:border-accent',
    };

    const badgeLabels = {
        match: `${job.matchPercentage}% Match`,
        'skill-gap': 'Skill Gap',
        promoted: 'Promoted',
    };

    const titleHoverColors = {
        match: 'group-hover:text-primary',
        'skill-gap': 'group-hover:text-secondary',
        promoted: 'group-hover:text-accent',
    };

    return (
        <div
            className={`group bg-white dark:bg-surface-dark border border-border-light dark:border-border-dark p-5 ${hoverStyles[job.type]} transition-all cursor-pointer relative shadow-sm rounded-xl`}
        >
            {/* Badge */}
            <div className="absolute top-0 right-0 p-4">
                <span
                    className={`inline-flex items-center px-2 py-1 rounded text-xs font-mono font-bold border ${badgeStyles[job.type]}`}
                >
                    {badgeLabels[job.type]}
                </span>
            </div>

            <div className="flex items-start">
                {/* Logo */}
                <div className="shrink-0 mr-4">
                    <div className="h-12 w-12 bg-slate-100 dark:bg-background-dark flex items-center justify-center border border-slate-200 dark:border-border-dark rounded-lg">
                        {job.logo ? (
                            <img src={job.logo} alt={job.company} className="h-8 w-8 object-contain" />
                        ) : (
                            <span className="material-symbols-outlined text-slate-400 dark:text-slate-300">
                                {getJobIcon(job.type)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div>
                    <h3
                        className={`text-base font-bold text-white font-mono transition-colors ${titleHoverColors[job.type]}`}
                    >
                        {job.title}
                    </h3>
                    <p className="text-sm text-slate-400 dark:text-slate-300 mt-1">
                        {job.company} • {job.location} • {job.salary}
                    </p>

                    {/* Tags */}
                    <div className="mt-4 flex flex-wrap gap-2">
                        {job.tags.map((tag) => {
                            const isSkillGap = job.type === 'skill-gap' && tag.includes('Missing');
                            return (
                                <span
                                    key={`${job.id}-${tag}`}
                                    className={`inline-flex items-center px-2 py-1 text-xs font-mono ${isSkillGap
                                        ? 'font-bold text-amber-700 dark:text-secondary bg-amber-50 dark:bg-background-dark border border-amber-200 dark:border-secondary/40'
                                        : 'font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-background-dark border border-slate-200 dark:border-border-dark'
                                        } rounded`}
                                >
                                    {tag}
                                </span>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
