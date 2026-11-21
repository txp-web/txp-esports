import { useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useFirebase } from '../context/FirebaseContext';
import { TournamentMode } from '../types';

export function ResultsSection() {
  const { results, resultsLoading } = useFirebase();
  const [modeFilter, setModeFilter] = useState<'All' | TournamentMode>('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const filtered = useMemo(() => {
    if (modeFilter === 'All') return results;
    return results.filter((r) => r.mode === modeFilter);
  }, [results, modeFilter]);

  const activeResult = useMemo(() => {
    if (filtered.length === 0) return null;
    if (selectedId) {
      const match = filtered.find((r) => r.id === selectedId);
      if (match) return match;
    }
    return filtered[0];
  }, [filtered, selectedId]);

  return (
    <section id="results" className="py-20 border-t border-white/10 bg-[#09090B]">
      <div className="max-w-7xl mx-auto px-6 space-y-10">
        {/* Header & Mode Filter */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs font-medium text-orange-400">
              05. Official Match Standings &amp; Payouts
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white text-balance">
              Tournament Results
            </h2>
            <p className="text-sm text-zinc-400">
              Verified placement points, finish counts, MVP honors, and settled prize
              distributions across Solo and Squad brackets.
            </p>
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-[#121318] border border-white/10 rounded-lg self-start">
            {(['All', 'Squad', 'Solo'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setModeFilter(tab);
                  setSelectedId(null);
                }}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  modeFilter === tab
                    ? 'bg-orange-500 text-zinc-950 font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab === 'All' ? 'All Modes' : tab}
              </button>
            ))}
          </div>
        </div>

        {resultsLoading ? (
          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 h-72 bg-[#121318] border border-white/10 rounded-xl animate-pulse" />
            <div className="lg:col-span-8 h-72 bg-[#121318] border border-white/10 rounded-xl animate-pulse" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-[#121318] border border-white/10 rounded-xl p-10 text-center space-y-2">
            <p className="text-base font-semibold text-white">
              No published tournament results yet
            </p>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              Completed Solo and Squad match leaderboards will appear here as soon as an
              admin publishes verified standings.
            </p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-8 items-stretch">
            {/* Left column: Trophy highlight + Event switcher */}
            <div className="lg:col-span-4 flex flex-col gap-5">
              <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden border border-white/10 bg-[#121318]">
                {!imgFailed ? (
                  <img
                    src="/src/assets/images/champion_trophy_stage_1795163529015.jpg"
                    alt="TXP Esports championship trophy"
                    referrerPolicy="no-referrer"
                    onError={() => setImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#1B1D26] to-[#09090B] flex flex-col items-center justify-center gap-2">
                    <Trophy className="w-10 h-10 text-orange-400" />
                    <span className="text-xs text-zinc-400">TXP Champions</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/30 to-transparent" />
                {activeResult && (
                  <div className="absolute bottom-4 left-4 right-4">
                    <p className="text-xs text-orange-400 font-medium">
                      Booyah Champion · {activeResult.mode}
                    </p>
                    <p className="font-display text-2xl font-bold text-white truncate">
                      {activeResult.standings[0]?.name}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs text-zinc-400 font-medium">Completed Events</p>
                <div className="space-y-2">
                  {filtered.map((item) => {
                    const isSelected = activeResult?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#161820] border-orange-500/60 text-white'
                            : 'bg-[#121318] border-white/10 text-zinc-300 hover:border-white/20'
                        }`}
                      >
                        <p className="text-sm font-semibold truncate">
                          {item.tournamentTitle}
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {item.mode} · {item.mapName} · {item.matchDate}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right column: Standings Table */}
            {activeResult && (
              <div className="lg:col-span-8 bg-[#121318] border border-white/10 rounded-xl p-6 flex flex-col justify-between gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
                  <div>
                    <p className="text-xs text-zinc-400">
                      {activeResult.mode} · {activeResult.mapName} ·{' '}
                      {activeResult.matchDate}
                    </p>
                    <h3 className="font-display text-2xl font-bold text-white mt-1">
                      {activeResult.tournamentTitle}
                    </h3>
                  </div>
                  <div className="flex items-center gap-6 text-xs">
                    <div>
                      <p className="text-zinc-400">Match MVP</p>
                      <p className="font-semibold text-white mt-0.5">
                        {activeResult.mvpPlayer}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-400">Prize Paid</p>
                      <p className="font-mono font-semibold text-orange-400 tabular-nums mt-0.5">
                        ₹{activeResult.prizeDistributed.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-xs text-zinc-400">
                        <th className="py-3 pr-4 font-medium">Rank</th>
                        <th className="py-3 pr-4 font-medium">
                          {activeResult.mode === 'Squad' ? 'Squad' : 'Player'}
                        </th>
                        <th className="py-3 px-3 text-right font-medium">Kills</th>
                        <th className="py-3 px-3 text-right font-medium">Place Pts</th>
                        <th className="py-3 px-3 text-right font-medium">Kill Pts</th>
                        <th className="py-3 px-3 text-right font-medium">Total Pts</th>
                        <th className="py-3 pl-3 text-right font-medium">Prize</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {activeResult.standings.map((row) => (
                        <tr
                          key={`${row.rank}-${row.name}`}
                          className="hover:bg-white/[0.02]"
                        >
                          <td className="py-3.5 pr-4 font-mono tabular-nums font-semibold text-orange-400">
                            #{row.rank}
                          </td>
                          <td className="py-3.5 pr-4 font-medium text-white">
                            {row.name}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono tabular-nums text-zinc-300">
                            {row.kills}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono tabular-nums text-zinc-400">
                            {row.placementPoints}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono tabular-nums text-zinc-400">
                            {row.killPoints}
                          </td>
                          <td className="py-3.5 px-3 text-right font-mono tabular-nums font-semibold text-white">
                            {row.totalPoints}
                          </td>
                          <td className="py-3.5 pl-3 text-right font-mono tabular-nums text-emerald-400 font-medium">
                            {row.prizeWon > 0
                              ? `₹${row.prizeWon.toLocaleString('en-IN')}`
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
