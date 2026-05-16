export default function RankingTab() {
    return (
        <div className="text-center py-12 px-4">
            <span
                className="material-symbols-outlined text-5xl text-amber-400"
                style={{ fontVariationSettings: "'FILL' 1" }}
            >
                leaderboard
            </span>
            <h3 className="text-lg font-bold text-white mt-3">Ranking</h3>
            <p className="text-sm text-slate-300 mt-1 max-w-md mx-auto">
                O ranking ao vivo do piloto chega no fim do LI-26. A apuração do Top 1
                (kit DevQuest) é feita ao final da janela, com desempate por quem chegou primeiro.
            </p>
        </div>
    );
}
