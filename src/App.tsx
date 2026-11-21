import { useMemo, useState } from 'react';
import { ShieldCheck, Users } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navbar } from './components/Navbar';
import { RegistrationModal } from './components/RegistrationModal';
import { RosterModal } from './components/RosterModal';
import { RoomAccessSection } from './components/RoomAccessSection';
import { ResultsSection } from './components/ResultsSection';
import { WalletSection } from './components/WalletSection';
import { AdminPanel } from './components/AdminPanel';
import { FirebaseProvider, useFirebase } from './context/FirebaseContext';
import { Tournament, TournamentMode, TournamentStatus } from './types';

function MainApp() {
  const {
    isAdmin,
    tournaments,
    tournamentsLoading,
    myRegistrations,
    publicSlotsByTournament,
    settings,
  } = useFirebase();

  const [activeView, setActiveView] = useState<'home' | 'admin'>('home');
  const [modeFilter, setModeFilter] = useState<'All' | TournamentMode>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | TournamentStatus>('all');
  const [regTournament, setRegTournament] = useState<Tournament | null>(null);
  const [rosterTournament, setRosterTournament] = useState<Tournament | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [soloImgFailed, setSoloImgFailed] = useState(false);
  const [squadImgFailed, setSquadImgFailed] = useState(false);

  const filteredTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      if (modeFilter !== 'All' && t.mode !== modeFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      return true;
    });
  }, [tournaments, modeFilter, statusFilter]);

  const handleNavigateView = (view: 'home' | 'admin', sectionId?: string) => {
    setActiveView(view);
    if (view === 'home' && sectionId) {
      setTimeout(() => {
        if (sectionId === 'top') {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
        }
      }, 40);
    } else if (view === 'admin') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const jumpToBracket = (mode: TournamentMode) => {
    setModeFilter(mode);
    setStatusFilter('all');
    document.getElementById('tournaments')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div id="top" className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col">
      <Navbar activeView={activeView} onNavigateView={handleNavigateView} />

      {activeView === 'admin' ? (
        <main className="flex-1">
          <AdminPanel onExitAdmin={() => handleNavigateView('home', 'top')} />
        </main>
      ) : (
        <main className="flex-1">
          {/* HERO SECTION */}
          <section className="relative overflow-hidden border-b border-white/10">
            <div className="relative min-h-[540px] lg:min-h-[600px] flex items-end">
              {!heroImgFailed ? (
                <img
                  src="/src/assets/images/hero_esports_arena_1795163529113.jpg"
                  alt="TXP Esports competitive tournament stage"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#1C140D] via-[#09090B] to-[#09090B]" />
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/75 to-[#09090B]/35" />

              <div className="relative z-10 max-w-7xl mx-auto w-full px-6 py-16 lg:py-20">
                <div className="max-w-2xl space-y-5">
                  <p className="text-xs font-medium text-orange-400">
                    Free Fire Competitive Arena · Solo &amp; Squad Brackets
                  </p>
                  <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.05] text-balance">
                    Drop In. Claim the Booyah. Win Verified Prize Pools.
                  </h1>
                  <p className="text-base text-zinc-300 leading-relaxed max-w-xl">
                    TXP Esports hosts daily and weekly Free Fire custom lobbies with
                    instant UPI slot checkout, verified Room ID &amp; Password access, and
                    transparent point-based leaderboards.
                  </p>
                  <div className="pt-2 flex flex-wrap items-center gap-4">
                    <a
                      href="#tournaments"
                      className="px-6 py-3 bg-orange-500 hover:bg-orange-400 text-zinc-950 font-semibold text-sm rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Browse Tournaments
                    </a>
                    <a
                      href="#room-access"
                      className="px-6 py-3 bg-[#14151A]/90 hover:bg-[#1C1E26] border border-white/15 text-white font-medium text-sm rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Check Room ID &amp; Password
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* 4-Column Feature Strip Below Hero */}
            <div className="bg-[#0D0E12] border-t border-white/10">
              <div className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <p className="text-xs text-zinc-400">Tournament Formats</p>
                  <p className="text-sm font-semibold text-white mt-1">
                    Solo &amp; 4-Player Squads
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Entry Checkout</p>
                  <p className="text-sm font-semibold text-white mt-1">
                    UPI ID &amp; UTR Verification
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Lobby Security</p>
                  <p className="text-sm font-semibold text-white mt-1">
                    Verified Room ID &amp; Password
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400">Official Payouts</p>
                  <p className="text-sm font-semibold text-white mt-1">
                    Booyah + Per-Kill Rewards
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 01. SOLO & SQUAD DIVISIONS */}
          <section className="py-20 bg-[#09090B]">
            <div className="max-w-7xl mx-auto px-6 space-y-10">
              <div className="max-w-2xl space-y-2">
                <p className="text-xs font-medium text-orange-400">
                  01. Competitive Divisions
                </p>
                <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white text-balance">
                  Built for Solo Specialists and Full Squads
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-6 items-stretch">
                {/* Solo Card */}
                <div className="bg-[#121318] border border-white/10 rounded-xl overflow-hidden flex flex-col">
                  <div className="relative aspect-[4/3] w-full bg-[#161820]">
                    {!soloImgFailed ? (
                      <img
                        src="/src/assets/images/solo_tournament_banner_1795163528414.jpg"
                        alt="Solo division tactical operative"
                        referrerPolicy="no-referrer"
                        onError={() => setSoloImgFailed(true)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-950/40 to-[#121318] flex items-center justify-center">
                        <ShieldCheck className="w-10 h-10 text-orange-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#121318] via-transparent to-transparent" />
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between gap-5">
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-400">
                        48 Players · Individual Leaderboard · Per-Kill Cash
                      </p>
                      <h3 className="font-display text-2xl font-bold text-white">
                        Solo Survival Division
                      </h3>
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        Pure mechanical skill and rotation IQ. Every elimination earns
                        direct per-kill rewards alongside top-3 Booyah podium payouts.
                      </p>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => jumpToBracket('Solo')}
                        className="px-4 py-2 bg-[#1A1C24] hover:bg-orange-500 hover:text-zinc-950 border border-white/15 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                      >
                        View Solo Lobbies
                      </button>
                    </div>
                  </div>
                </div>

                {/* Squad Card */}
                <div className="bg-[#121318] border border-white/10 rounded-xl overflow-hidden flex flex-col">
                  <div className="relative aspect-[4/3] w-full bg-[#161820]">
                    {!squadImgFailed ? (
                      <img
                        src="/src/assets/images/squad_tournament_banner_1795163528905.jpg"
                        alt="Four-player tactical squad advancing"
                        referrerPolicy="no-referrer"
                        onError={() => setSquadImgFailed(true)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-950/40 to-[#121318] flex items-center justify-center">
                        <Users className="w-10 h-10 text-orange-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#121318] via-transparent to-transparent" />
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between gap-5">
                    <div className="space-y-2">
                      <p className="text-xs text-zinc-400">
                        12 Squads (48 Players) · Full Map · Captain Registration
                      </p>
                      <h3 className="font-display text-2xl font-bold text-white">
                        Squad Championship Division
                      </h3>
                      <p className="text-sm text-zinc-400 leading-relaxed">
                        Register your 4-player roster once via your squad captain. Track
                        verified slot numbers and share unlocked room credentials with
                        your team.
                      </p>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={() => jumpToBracket('Squad')}
                        className="px-4 py-2 bg-[#1A1C24] hover:bg-orange-500 hover:text-zinc-950 border border-white/15 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                      >
                        View Squad Lobbies
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 02. ACTIVE TOURNAMENTS */}
          <section
            id="tournaments"
            className="py-20 border-t border-white/10 bg-[#09090B]"
          >
            <div className="max-w-7xl mx-auto px-6 space-y-10">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <p className="text-xs font-medium text-orange-400">
                    02. Tournament Schedule &amp; Registration
                  </p>
                  <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white text-balance">
                    Active Tournaments
                  </h2>
                  <p className="text-sm text-zinc-400">
                    Select a Solo or Squad bracket to register your Free Fire UID and
                    complete entry payment.
                  </p>
                </div>

                {/* Filter Controls */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-1 p-1 bg-[#121318] border border-white/10 rounded-lg">
                    {(['All', 'Solo', 'Squad'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setModeFilter(tab)}
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

                  <div className="inline-flex items-center gap-1 p-1 bg-[#121318] border border-white/10 rounded-lg">
                    {(['all', 'upcoming', 'live', 'completed'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatusFilter(st)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize whitespace-nowrap shrink-0 cursor-pointer ${
                          statusFilter === st
                            ? 'bg-[#222530] text-white'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {st === 'all' ? 'All Status' : st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {tournamentsLoading ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className="h-56 bg-[#121318] border border-white/10 rounded-xl animate-pulse"
                    />
                  ))}
                </div>
              ) : filteredTournaments.length === 0 ? (
                <div className="bg-[#121318] border border-white/10 rounded-xl p-10 text-center space-y-4">
                  <p className="text-base font-semibold text-white">
                    No tournaments match the selected filter
                  </p>
                  <p className="text-sm text-zinc-400 max-w-md mx-auto">
                    {tournaments.length === 0
                      ? 'The tournament organizer has not published lobbies yet. Sign in as Admin to create tournaments or load starter events.'
                      : 'Try switching mode or status filters to view available Free Fire brackets.'}
                  </p>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleNavigateView('admin')}
                      className="px-5 py-2.5 bg-orange-500 hover:bg-orange-400 text-zinc-950 font-semibold text-sm rounded-lg transition-colors cursor-pointer"
                    >
                      Open Admin Panel
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {filteredTournaments.map((t) => {
                    const slots = publicSlotsByTournament[t.id] || [];
                    const filledCount = slots.filter(
                      (s) => s.paymentStatus !== 'rejected'
                    ).length;
                    const fillPct = Math.min(
                      100,
                      Math.round((filledCount / Math.max(1, t.maxSlots)) * 100)
                    );
                    const userReg = myRegistrations.find((r) => r.tournamentId === t.id);

                    return (
                      <article
                        key={t.id}
                        className="bg-[#121318] border border-white/10 rounded-xl p-6 flex flex-col justify-between gap-6 hover:border-white/20 transition-colors"
                      >
                        <div className="space-y-4">
                          {/* Quiet 1-line unboxed metadata */}
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <p className="text-zinc-400 truncate">
                              {t.mode} · {t.mapName} · {t.startTime}
                            </p>
                            <span
                              className={`font-semibold capitalize shrink-0 ${
                                t.status === 'live'
                                  ? 'text-orange-400'
                                  : t.status === 'completed'
                                  ? 'text-zinc-500'
                                  : 'text-emerald-400'
                              }`}
                            >
                              {t.status}
                            </span>
                          </div>

                          <div>
                            <h3 className="font-display text-2xl font-bold text-white">
                              {t.title}
                            </h3>
                            <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2 leading-relaxed">
                              {t.rulesSummary}
                            </p>
                          </div>

                          {/* Financial & Slot Metrics */}
                          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                            <div>
                              <p className="text-xs text-zinc-400">Entry Fee</p>
                              <p className="font-mono text-base font-semibold text-white tabular-nums mt-0.5">
                                {t.entryFee === 0 ? 'Free' : `₹${t.entryFee}`}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-400">Prize Pool</p>
                              <p className="font-mono text-base font-semibold text-orange-400 tabular-nums mt-0.5">
                                ₹{t.prizePool.toLocaleString('en-IN')}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-zinc-400">Per Kill</p>
                              <p className="font-mono text-base font-semibold text-zinc-200 tabular-nums mt-0.5">
                                ₹{t.perKillPrize}
                              </p>
                            </div>
                          </div>

                          {/* Slot Capacity Progress */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-zinc-400">
                                {t.mode === 'Squad' ? 'Squads Joined' : 'Players Joined'}
                              </span>
                              <span className="font-mono text-zinc-200 tabular-nums">
                                {filledCount} / {t.maxSlots}
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-[#09090B] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-orange-500 transition-all duration-300"
                                style={{ width: `${fillPct}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setRosterTournament(t)}
                            className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-[#181A22] border border-white/10 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            View Roster ({filledCount})
                          </button>

                          {t.status === 'completed' ? (
                            <a
                              href="#results"
                              className="px-5 py-2 text-xs font-semibold text-zinc-200 bg-[#1B1D26] hover:bg-[#242733] border border-white/15 rounded-lg transition-colors whitespace-nowrap shrink-0"
                            >
                              View Results
                            </a>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setRegTournament(t)}
                              className="px-5 py-2 text-xs font-semibold text-zinc-950 bg-orange-500 hover:bg-orange-400 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              {userReg
                                ? `Entry: ${userReg.paymentStatus}`
                                : filledCount >= t.maxSlots
                                ? 'Lobby Full'
                                : 'Register Now'}
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* 03. TXP WALLET */}
          <WalletSection />

          {/* 04. ROOM ID & PASSWORD */}
          <RoomAccessSection
            onOpenRegistration={(tournament) => setRegTournament(tournament)}
          />

          {/* 05. TOURNAMENT RESULTS */}
          <ResultsSection />

          {/* 05. SCORING & FAIR PLAY RULES */}
          <section
            id="rules"
            className="py-20 border-t border-white/10 bg-[#0D0E12]"
          >
            <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-12 gap-12">
              <div className="lg:col-span-5 space-y-3">
                <p className="text-xs font-medium text-orange-400">
                  06. Official Scoring &amp; Fair Play
                </p>
                <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white text-balance">
                  Standard Free Fire Point Matrix
                </h2>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  Every TXP Esports tournament uses standardized placement points plus
                  1 point per elimination. Ties are broken first by Booyahs, then total
                  kills, then final match placement.
                </p>
              </div>

              <div className="lg:col-span-7 grid sm:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white">
                    Placement Points Table
                  </h3>
                  <div className="divide-y divide-white/10 border-y border-white/10 text-sm">
                    {[
                      ['1st Place (Booyah)', '12 pts'],
                      ['2nd Place', '9 pts'],
                      ['3rd Place', '8 pts'],
                      ['4th Place', '7 pts'],
                      ['5th Place', '6 pts'],
                      ['6th – 8th Place', '5 – 3 pts'],
                      ['Each Elimination', '1 pt'],
                    ].map(([pos, pts]) => (
                      <div
                        key={pos}
                        className="py-2.5 flex items-center justify-between gap-4"
                      >
                        <span className="text-zinc-300">{pos}</span>
                        <span className="font-mono font-semibold text-orange-400 tabular-nums">
                          {pts}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-white">
                    Tournament Integrity Rules
                  </h3>
                  <ul className="space-y-3 text-sm text-zinc-400 leading-relaxed">
                    <li>
                      01. Register with your exact Free Fire IGN and numeric UID;
                      mismatched lobby accounts will be kicked before drop.
                    </li>
                    <li>
                      02. Emulators, scripts, GFX tools, and teaming in Solo matches
                      result in immediate disqualification and prize forfeiture.
                    </li>
                    <li>
                      03. Room ID &amp; Password unlock exclusively for verified players
                      15 minutes prior to match start.
                    </li>
                    <li>
                      04. Prize payouts are dispatched via UPI within 2 hours after
                      official standings are published.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </main>
      )}

      {/* QUIET FOOTER */}
      <footer className="bg-[#09090B] border-t border-white/10 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <p className="font-display text-xl font-bold text-white">TXP Esports</p>
            <p className="text-xs text-zinc-500">
              Free Fire Solo &amp; Squad Competitive Tournaments · Support:{' '}
              <span className="font-mono text-zinc-400">{settings.whatsappNumber}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-zinc-400">
            <a
              href="#tournaments"
              onClick={(e) => {
                e.preventDefault();
                handleNavigateView('home', 'tournaments');
              }}
              className="hover:text-white transition-colors"
            >
              Tournaments
            </a>
            <a
              href="#wallet"
              onClick={(e) => {
                e.preventDefault();
                handleNavigateView('home', 'wallet');
              }}
              className="hover:text-white transition-colors"
            >
              Wallet
            </a>
            <a
              href="#room-access"
              onClick={(e) => {
                e.preventDefault();
                handleNavigateView('home', 'room-access');
              }}
              className="hover:text-white transition-colors"
            >
              Room Access
            </a>
            <a
              href="#results"
              onClick={(e) => {
                e.preventDefault();
                handleNavigateView('home', 'results');
              }}
              className="hover:text-white transition-colors"
            >
              Results
            </a>
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleNavigateView('admin')}
                className="text-orange-400 hover:text-orange-300 font-medium cursor-pointer"
              >
                Admin Console
              </button>
            )}
          </div>
        </div>
      </footer>

      <RegistrationModal
        tournament={regTournament}
        onClose={() => setRegTournament(null)}
      />

      <RosterModal
        tournament={rosterTournament}
        slots={
          rosterTournament
            ? publicSlotsByTournament[rosterTournament.id] || []
            : []
        }
        onClose={() => setRosterTournament(null)}
        onRegisterClick={(t) => setRegTournament(t)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <FirebaseProvider>
        <MainApp />
      </FirebaseProvider>
    </ErrorBoundary>
  );
}
