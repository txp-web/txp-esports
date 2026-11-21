import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Check, Copy, KeyRound, Lock } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useFirebase } from '../context/FirebaseContext';
import { RoomAccess, Tournament } from '../types';

interface RoomAccessSectionProps {
  onOpenRegistration: (tournament: Tournament) => void;
}

export function RoomAccessSection({ onOpenRegistration }: RoomAccessSectionProps) {
  const {
    user,
    signingIn,
    signInWithGoogle,
    myRegistrations,
    tournaments,
    settings,
  } = useFirebase();

  const [roomDataByTournament, setRoomDataByTournament] = useState<
    Record<string, RoomAccess>
  >({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !user.emailVerified || myRegistrations.length === 0) {
      setRoomDataByTournament({});
      return;
    }

    let cancelled = false;

    const loadCredentials = async () => {
      const nextMap: Record<string, RoomAccess> = {};
      for (const reg of myRegistrations) {
        if (reg.paymentStatus !== 'verified') continue;
        const tournament = tournaments.find((t) => t.id === reg.tournamentId);
        if (!tournament?.roomReleased) continue;

        const path = `tournaments/${reg.tournamentId}/roomAccess/credentials`;
        try {
          const snap = await getDoc(
            doc(db, 'tournaments', reg.tournamentId, 'roomAccess', 'credentials')
          );
          if (snap.exists() && !cancelled) {
            nextMap[reg.tournamentId] = snap.data() as RoomAccess;
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, path);
        }
      }
      if (!cancelled) {
        setRoomDataByTournament(nextMap);
      }
    };

    void loadCredentials();

    return () => {
      cancelled = true;
    };
  }, [user, myRegistrations, tournaments]);

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <section
      id="room-access"
      className="py-20 border-t border-white/10 bg-[#0D0E12]"
    >
      <div className="max-w-7xl mx-auto px-6 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-medium text-orange-400">
              04. Protected Custom Lobby Credentials
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white text-balance">
              Room ID &amp; Password Access
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              {settings.announcement}
            </p>
          </div>

          {!user && (
            <button
              type="button"
              disabled={signingIn}
              onClick={() => void signInWithGoogle()}
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-400 text-zinc-950 font-semibold text-sm rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {signingIn ? 'Signing In...' : 'Sign In to View Rooms'}
            </button>
          )}
        </div>

        {!user ? (
          <div className="bg-[#121318] border border-white/10 rounded-xl p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2 text-zinc-200 font-semibold">
                <Lock className="w-4 h-4 text-orange-400 shrink-0" />
                <span>Verified Players Only</span>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Sign in with the Google account you used during registration to view your
                payment verification status, assigned slot number, and custom room
                credentials.
              </p>
            </div>
            <button
              type="button"
              disabled={signingIn}
              onClick={() => void signInWithGoogle()}
              className="px-5 py-2.5 bg-[#1B1D26] hover:bg-[#232631] border border-white/15 text-white font-medium text-sm rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Player Sign In
            </button>
          </div>
        ) : myRegistrations.length === 0 ? (
          <div className="bg-[#121318] border border-white/10 rounded-xl p-8 space-y-3">
            <p className="text-base font-semibold text-white">
              No tournament registrations found for {user.email}
            </p>
            <p className="text-sm text-zinc-400 max-w-xl">
              Register for any upcoming Solo or Squad tournament above. Once your entry
              and payment UTR are verified by an admin, your Room ID and Password will
              appear here automatically.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {myRegistrations.map((reg) => {
              const tournament = tournaments.find((t) => t.id === reg.tournamentId);
              const creds = roomDataByTournament[reg.tournamentId];

              return (
                <div
                  key={reg.id}
                  className="bg-[#121318] border border-white/10 rounded-xl p-6 flex flex-col justify-between gap-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-xs text-zinc-400">
                          {reg.mode} · {tournament?.mapName || 'Custom Lobby'} ·{' '}
                          {tournament?.startTime || 'Scheduled'}
                        </p>
                        <h3 className="font-display text-2xl font-bold text-white mt-1 truncate">
                          {reg.tournamentTitle}
                        </h3>
                      </div>
                      <span
                        className={`text-xs font-semibold shrink-0 ${
                          reg.paymentStatus === 'verified'
                            ? 'text-emerald-400'
                            : reg.paymentStatus === 'rejected'
                            ? 'text-red-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {reg.paymentStatus === 'verified'
                          ? `Verified${reg.slotNumber > 0 ? ` · Slot #${reg.slotNumber}` : ''}`
                          : reg.paymentStatus === 'rejected'
                          ? 'Payment Rejected'
                          : 'Pending Verification'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-zinc-400">
                      <span>
                        Entry:{' '}
                        <strong className="text-zinc-200 font-medium">
                          {reg.teamName || reg.leaderIgn}
                        </strong>
                      </span>
                      <span>
                        UTR:{' '}
                        <code className="font-mono text-zinc-200">{reg.paymentUtr}</code>
                      </span>
                    </div>
                  </div>

                  {reg.paymentStatus === 'verified' && creds ? (
                    <div className="bg-[#09090B] border border-orange-500/30 rounded-lg p-4 space-y-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-orange-400">
                        <KeyRound className="w-4 h-4 shrink-0" />
                        <span>Custom Room Unlocked</span>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="bg-[#14151A] border border-white/10 rounded-lg px-3.5 py-2.5 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[11px] text-zinc-400">Room ID</p>
                            <p className="font-mono text-base font-semibold text-white tabular-nums truncate">
                              {creds.roomId}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              void handleCopy(`id-${reg.id}`, creds.roomId)
                            }
                            aria-label="Copy Room ID"
                            className="p-2 text-zinc-300 hover:text-white rounded-md hover:bg-white/5 cursor-pointer"
                          >
                            {copiedKey === `id-${reg.id}` ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        <div className="bg-[#14151A] border border-white/10 rounded-lg px-3.5 py-2.5 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[11px] text-zinc-400">Password</p>
                            <p className="font-mono text-base font-semibold text-white tabular-nums truncate">
                              {creds.roomPassword}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              void handleCopy(`pw-${reg.id}`, creds.roomPassword)
                            }
                            aria-label="Copy Room Password"
                            className="p-2 text-zinc-300 hover:text-white rounded-md hover:bg-white/5 cursor-pointer"
                          >
                            {copiedKey === `pw-${reg.id}` ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {creds.instructions && (
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          {creds.instructions}
                        </p>
                      )}
                    </div>
                  ) : reg.paymentStatus === 'verified' ? (
                    <div className="bg-[#09090B] border border-white/10 rounded-lg p-4 text-xs text-zinc-400">
                      Your slot is confirmed. Room ID &amp; Password will unlock here 15
                      minutes prior to match start.
                    </div>
                  ) : reg.paymentStatus === 'rejected' ? (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <p className="text-xs text-red-300">
                        {reg.adminNote || 'Payment reference could not be verified.'}
                      </p>
                      {tournament && (
                        <button
                          type="button"
                          onClick={() => onOpenRegistration(tournament)}
                          className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-400 text-zinc-950 font-semibold text-xs rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          Update UTR
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="bg-[#09090B] border border-white/10 rounded-lg p-4 text-xs text-zinc-400">
                      Admin verification in progress. Room ID &amp; Password stay hidden
                      until your entry is approved.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
