import { X } from 'lucide-react';
import { PublicSlot, Tournament } from '../types';

interface RosterModalProps {
  tournament: Tournament | null;
  slots: PublicSlot[];
  onClose: () => void;
  onRegisterClick: (tournament: Tournament) => void;
}

export function RosterModal({
  tournament,
  slots,
  onClose,
  onRegisterClick,
}: RosterModalProps) {
  if (!tournament) return null;

  const verifiedCount = slots.filter((s) => s.paymentStatus === 'verified').length;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="roster-modal-title"
    >
      <div className="bg-[#121318] border border-white/15 rounded-xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        <div className="px-6 py-5 border-b border-white/10 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-zinc-400">
              {tournament.mode} · {tournament.mapName} · {verifiedCount} Verified /{' '}
              {tournament.maxSlots} Max Slots
            </p>
            <h2
              id="roster-modal-title"
              className="font-display text-2xl font-bold text-white mt-1 truncate"
            >
              {tournament.title} — Registered Roster
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close roster"
            className="p-2 text-zinc-400 hover:text-white rounded-lg border border-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {slots.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-sm text-zinc-400">
                No players or squads have registered for this lobby yet.
              </p>
              {tournament.status !== 'completed' && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRegisterClick(tournament);
                  }}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-400 text-zinc-950 font-semibold text-sm rounded-lg transition-colors cursor-pointer"
                >
                  Claim First Slot
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-zinc-400">
                    <th className="py-2.5 pr-4 font-medium">Slot</th>
                    <th className="py-2.5 pr-4 font-medium">
                      {tournament.mode === 'Squad' ? 'Squad Name' : 'Player IGN'}
                    </th>
                    <th className="py-2.5 pr-4 font-medium">Mode</th>
                    <th className="py-2.5 text-right font-medium">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {slots.map((slot) => (
                    <tr key={slot.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 pr-4 font-mono tabular-nums text-zinc-300">
                        {slot.slotNumber > 0 ? `#${String(slot.slotNumber).padStart(2, '0')}` : '—'}
                      </td>
                      <td className="py-3 pr-4 font-medium text-white">{slot.displayName}</td>
                      <td className="py-3 pr-4 text-zinc-400">{slot.mode}</td>
                      <td className="py-3 text-right">
                        {slot.paymentStatus === 'verified' && (
                          <span className="text-xs font-medium text-emerald-400">
                            Verified
                          </span>
                        )}
                        {slot.paymentStatus === 'pending' && (
                          <span className="text-xs font-medium text-amber-400">
                            Pending Review
                          </span>
                        )}
                        {slot.paymentStatus === 'rejected' && (
                          <span className="text-xs font-medium text-red-400">
                            Action Needed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
