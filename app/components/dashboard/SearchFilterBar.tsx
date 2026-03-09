'use client';

interface SearchFilterBarProps {
    readonly onSearchChange?: (value: string) => void;
    readonly onSortChange?: (value: string) => void;
    readonly onLevelChange?: (value: string) => void;
    readonly onWorkModelChange?: (value: string) => void;
}

const selectClass =
    'appearance-none pl-3 pr-8 py-2.5 text-sm font-medium border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-surface-dark text-slate-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors cursor-pointer hover:border-primary/60 dark:hover:border-primary/60 bg-no-repeat bg-right';

export default function SearchFilterBar({ onSearchChange, onSortChange, onLevelChange, onWorkModelChange }: Readonly<SearchFilterBarProps>) {
    return (
        <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-surface-dark p-4 border border-border-light dark:border-border-dark rounded-xl shadow-sm">
            {/* Search Input */}
            <div className="relative grow">
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>search</span>
                </span>
                <input
                    className="block w-full pl-9 pr-3 py-2.5 border border-border-light dark:border-border-dark rounded-lg dark:bg-background-dark text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm transition-colors"
                    placeholder="Filtrar por título, empresa ou tecnologia..."
                    type="text"
                    onChange={(e) => onSearchChange?.(e.target.value)}
                />
            </div>

            <div className="flex gap-3 flex-wrap sm:flex-nowrap">
                {/* Level Filter */}
                <div className="relative">
                    <select
                        className={selectClass}
                        onChange={(e) => onLevelChange?.(e.target.value)}
                        defaultValue="all"
                        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundPosition: "right 10px center", backgroundRepeat: "no-repeat" }}
                    >
                        <option value="all">Todas senioridades</option>
                        <option value="ESTAGIO">Estágio</option>
                        <option value="JUNIOR">Júnior</option>
                        <option value="PLENO">Pleno</option>
                        <option value="SENIOR">Sênior</option>
                    </select>
                </div>

                {/* Work Model Filter */}
                <div className="relative">
                    <select
                        className={selectClass}
                        onChange={(e) => onWorkModelChange?.(e.target.value)}
                        defaultValue="all"
                        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundPosition: "right 10px center", backgroundRepeat: "no-repeat" }}
                    >
                        <option value="all">Todos modelos</option>
                        <option value="remote">Remoto</option>
                        <option value="hybrid">Híbrido</option>
                        <option value="onsite">Presencial</option>
                    </select>
                </div>

                {/* Sort Dropdown */}
                <div className="relative">
                    <select
                        className={selectClass}
                        onChange={(e) => onSortChange?.(e.target.value)}
                        defaultValue="relevant"
                        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundPosition: "right 10px center", backgroundRepeat: "no-repeat" }}
                    >
                        <option value="relevant">Mais compatíveis</option>
                        <option value="newest">Mais recentes</option>
                        <option value="salary">Empresa (A-Z)</option>
                    </select>
                </div>
            </div>
        </div>
    );
}
