import React, { useMemo, useState } from 'react';
import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { CheckCircle2, ShieldAlert, X } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useFirebase } from '../context/FirebaseContext';
import { PaymentMethod, Tournament, VALIDATION_RULES } from '../types';
import { UpiPaymentBox } from './UpiPaymentBox';

interface RegistrationModalProps {
  tournament: Tournament | null;
  onClose: () => void;
}

export function RegistrationModal({ tournament, onClose }: RegistrationModalProps) {
  const {
    user,
    settings,
    myRegistrations,
    wallet,
    signInWithGoogle,
    signingIn,
  } = useFirebase();

  const existingReg = useMemo(() => {
    if (!tournament) return undefined;
    return myRegistrations.find((r) => r.tournamentId === tournament.id);
  }, [myRegistrations, tournament]);

  const [teamName, setTeamName] = useState('');
  const [leaderIgn, setLeaderIgn] = useState('');
  const [leaderUid, setLeaderUid] = useState('');
  const [p2Ign, setP2Ign] = useState('');
  const [p2Uid, setP2Uid] = useState('');
  const [p3Ign, setP3Ign] = useState('');
  const [p3Uid, setP3Uid] = useState('');
  const [p4Ign, setP4Ign] = useState('');
  const [p4Uid, setP4Uid] = useState('');
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    tournament && tournament.entryFee === 0 ? 'Free Entry' : 'UPI QR'
  );
  const [paymentUtr, setPaymentUtr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Resubmission state for rejected registrations
  const [resubmitUtr, setResubmitUtr] = useState('');
  const [resubmitPhone, setResubmitPhone] = useState('');
  const [resubmitMethod, setResubmitMethod] = useState<PaymentMethod>('UPI QR');

  if (!tournament) return null;

  const isFree = tournament.entryFee === 0;
  const isSquad = tournament.mode === 'Squad';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!user) {
      await signInWithGoogle();
      return;
    }

    const cleanIgn = leaderIgn.trim();
    const cleanUid = leaderUid.trim();
    const cleanTeam = isSquad ? teamName.trim() : '';
    const cleanPhone = whatsappPhone.trim();
    const usingWallet = !isFree && paymentMethod === 'Wallet';
    const walletTxId = `entry_${tournament.id}_${user.uid}`;
    const cleanUtr = isFree
      ? 'FREE_ENTRY'
      : usingWallet
      ? `WALLET_${walletTxId}`.slice(0, 60)
      : paymentUtr.trim();

    if (isSquad && (cleanTeam.length < 2 || cleanTeam.length > VALIDATION_RULES.MAX_TEAM_LEN)) {
      setErrorMsg('Squad Name must be between 2 and 50 characters.');
      return;
    }
    if (cleanIgn.length < 2 || cleanIgn.length > VALIDATION_RULES.MAX_IGN_LEN) {
      setErrorMsg('Leader / Player IGN must be between 2 and 40 characters.');
      return;
    }
    if (
      cleanUid.length < VALIDATION_RULES.MIN_UID_LEN ||
      cleanUid.length > VALIDATION_RULES.MAX_UID_LEN ||
      !VALIDATION_RULES.UID_PATTERN.test(cleanUid)
    ) {
      setErrorMsg('Free Fire UID must be numeric (5 to 20 digits).');
      return;
    }
    if (
      cleanPhone.length < VALIDATION_RULES.MIN_PHONE_LEN ||
      cleanPhone.length > VALIDATION_RULES.MAX_PHONE_LEN ||
      !VALIDATION_RULES.PHONE_PATTERN.test(cleanPhone)
    ) {
      setErrorMsg('Enter a valid contact phone number (8 to 20 digits).');
      return;
    }
    if (!isFree && usingWallet) {
      if (!wallet || wallet.balance < tournament.entryFee) {
        setErrorMsg(
          `Insufficient wallet balance (Available: ₹${wallet?.balance ?? 0}, Required: ₹${
            tournament.entryFee
          }).`
        );
        return;
      }
    } else if (!isFree) {
      if (
        cleanUtr.length < VALIDATION_RULES.MIN_UTR_LEN ||
        cleanUtr.length > VALIDATION_RULES.MAX_UTR_LEN ||
        !VALIDATION_RULES.UTR_PATTERN.test(cleanUtr)
      ) {
        setErrorMsg(
          'Enter a valid Payment UTR / Reference ID (letters, numbers, hyphen or underscore only).'
        );
        return;
      }
    }

    const squadMembers: string[] = [];
    if (isSquad) {
      const extras = [
        { ign: p2Ign.trim(), uid: p2Uid.trim(), label: 'Player 2' },
        { ign: p3Ign.trim(), uid: p3Uid.trim(), label: 'Player 3' },
        { ign: p4Ign.trim(), uid: p4Uid.trim(), label: 'Player 4' },
      ];
      for (const member of extras) {
        if (member.ign || member.uid) {
          if (!member.ign || !VALIDATION_RULES.UID_PATTERN.test(member.uid)) {
            setErrorMsg(`${member.label} requires both IGN and numeric Free Fire UID.`);
            return;
          }
          squadMembers.push(`${member.ign} (${member.uid})`.slice(0, 70));
        }
      }
      if (squadMembers.length === 0) {
        setErrorMsg('Squad tournaments require at least 1 additional teammate IGN and UID.');
        return;
      }
    }

    const regId = `${tournament.id}_${user.uid}`;
    if (!VALIDATION_RULES.ID_PATTERN.test(regId)) {
      setErrorMsg('Invalid tournament registration identifier.');
      return;
    }

    setSubmitting(true);
    try {
      const batch = writeBatch(db);
      const now = serverTimestamp();

      if (usingWallet && wallet) {
        batch.set(doc(db, 'walletTransactions', walletTxId), {
          userId: user.uid,
          userEmail: (user.email || 'player@txpesports.com').slice(0, 120),
          type: 'entry_fee',
          amount: tournament.entryFee,
          status: 'approved',
          utrOrUpi: tournament.id.slice(0, 80),
          tournamentId: tournament.id,
          note: `Entry fee for ${tournament.title}`.slice(0, 200),
          createdAt: now,
          updatedAt: now,
        });

        batch.update(doc(db, 'wallets', user.uid), {
          balance: wallet.balance - tournament.entryFee,
          lastTxId: walletTxId,
          updatedAt: now,
        });
      }

      batch.set(doc(db, 'registrations', regId), {
        tournamentId: tournament.id,
        tournamentTitle: tournament.title.slice(0, VALIDATION_RULES.MAX_TITLE_LEN),
        userId: user.uid,
        userEmail: (user.email || 'player@txpesports.com').slice(0, 120),
        mode: tournament.mode,
        teamName: cleanTeam,
        leaderIgn: cleanIgn,
        leaderUid: cleanUid,
        squadMembers,
        whatsappPhone: cleanPhone,
        paymentMethod: isFree ? 'Free Entry' : paymentMethod,
        paymentUtr: cleanUtr,
        amountPaid: tournament.entryFee,
        paymentStatus: usingWallet ? 'verified' : 'pending',
        adminNote: '',
        slotNumber: 0,
        createdAt: now,
        updatedAt: now,
      });

      batch.set(doc(db, 'tournaments', tournament.id, 'publicSlots', regId), {
        tournamentId: tournament.id,
        userId: user.uid,
        displayName: (isSquad ? cleanTeam : cleanIgn).slice(0, 60),
        mode: tournament.mode,
        paymentStatus: usingWallet ? 'verified' : 'pending',
        slotNumber: 0,
        createdAt: now,
        updatedAt: now,
      });

      await batch.commit();
      setSuccessMsg(
        usingWallet
          ? 'Paid from TXP Wallet! Your registration is instantly verified and ready for Room ID & Password release.'
          : 'Registration submitted! Your payment UTR is queued for admin verification. Once verified, Room ID & Password will unlock in Room Access.'
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `registrations/${regId}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !existingReg) return;
    setErrorMsg(null);

    const cleanUtr = resubmitUtr.trim();
    const cleanPhone = (resubmitPhone || existingReg.whatsappPhone).trim();

    if (
      cleanUtr.length < VALIDATION_RULES.MIN_UTR_LEN ||
      cleanUtr.length > VALIDATION_RULES.MAX_UTR_LEN ||
      !VALIDATION_RULES.UTR_PATTERN.test(cleanUtr)
    ) {
      setErrorMsg('Enter a valid Payment UTR / Reference ID.');
      return;
    }
    if (
      cleanPhone.length < VALIDATION_RULES.MIN_PHONE_LEN ||
      cleanPhone.length > VALIDATION_RULES.MAX_PHONE_LEN ||
      !VALIDATION_RULES.PHONE_PATTERN.test(cleanPhone)
    ) {
      setErrorMsg('Enter a valid contact phone number.');
      return;
    }

    setSubmitting(true);
    try {
      const batch = writeBatch(db);
      const now = serverTimestamp();

      batch.update(doc(db, 'registrations', existingReg.id), {
        paymentUtr: cleanUtr,
        paymentMethod: resubmitMethod,
        whatsappPhone: cleanPhone,
        paymentStatus: 'pending',
        updatedAt: now,
      });

      batch.update(
        doc(db, 'tournaments', tournament.id, 'publicSlots', existingReg.id),
        {
          paymentStatus: 'pending',
          updatedAt: now,
        }
      );

      await batch.commit();
      setSuccessMsg('Updated payment UTR submitted for re-verification.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `registrations/${existingReg.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reg-modal-title"
    >
      <div className="bg-[#121318] border border-white/15 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-zinc-400">
              {tournament.mode} · {tournament.mapName} · {tournament.startTime}
            </p>
            <h2
              id="reg-modal-title"
              className="font-display text-2xl font-bold text-white mt-1 truncate"
            >
              {tournament.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close registration modal"
            className="p-2 text-zinc-400 hover:text-white rounded-lg border border-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {existingReg || successMsg ? (
            <div className="space-y-5">
              <div className="bg-[#0D0E12] border border-white/10 rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-orange-400 shrink-0" />
                  <h3 className="font-semibold text-white">
                    {successMsg ? 'Registration Recorded' : 'Your Registration Status'}
                  </h3>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {successMsg ||
                    'You are already registered for this tournament. Track your slot and Room ID & Password inside the Room Access section.'}
                </p>

                {existingReg && (
                  <div className="pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <p className="text-zinc-400">Entry</p>
                      <p className="text-white font-medium mt-1">
                        {existingReg.teamName || existingReg.leaderIgn}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-400">Leader UID</p>
                      <p className="font-mono text-white mt-1 tabular-nums">
                        {existingReg.leaderUid}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-400">UTR Ref</p>
                      <p className="font-mono text-white mt-1 truncate">
                        {existingReg.paymentUtr}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-400">Status</p>
                      <p className="font-semibold mt-1 text-orange-400 capitalize">
                        {existingReg.paymentStatus}
                        {existingReg.slotNumber > 0
                          ? ` · Slot #${existingReg.slotNumber}`
                          : ''}
                      </p>
                    </div>
                  </div>
                )}

                {existingReg?.adminNote && (
                  <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-lg text-xs text-red-300">
                    Admin Note: {existingReg.adminNote}
                  </div>
                )}
              </div>

              {existingReg?.paymentStatus === 'rejected' && (
                <form onSubmit={(e) => void handleResubmit(e)} className="space-y-4">
                  <h4 className="text-sm font-semibold text-white">
                    Re-submit Payment UTR
                  </h4>
                  <UpiPaymentBox
                    upiId={settings.upiId}
                    upiName={settings.upiName}
                    amount={tournament.entryFee}
                    note={tournament.title}
                  />
                  <div className="grid sm:grid-cols-3 gap-3">
                    <select
                      value={resubmitMethod}
                      onChange={(e) => setResubmitMethod(e.target.value as PaymentMethod)}
                      className="bg-[#0D0E12] border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                    >
                      <option value="UPI QR">UPI App</option>
                      <option value="GPay">GPay</option>
                      <option value="PhonePe">PhonePe</option>
                      <option value="Paytm">Paytm</option>
                    </select>
                    <input
                      type="text"
                      required
                      value={resubmitUtr}
                      onChange={(e) => setResubmitUtr(e.target.value)}
                      placeholder="New UTR / Reference ID"
                      className="bg-[#0D0E12] border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
                    />
                    <input
                      type="text"
                      value={resubmitPhone}
                      onChange={(e) => setResubmitPhone(e.target.value)}
                      placeholder={existingReg.whatsappPhone}
                      className="bg-[#0D0E12] border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  {errorMsg && (
                    <p className="text-xs text-red-400 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 bg-orange-500 hover:bg-orange-400 text-zinc-950 font-semibold text-sm rounded-lg transition-colors cursor-pointer"
                  >
                    {submitting ? 'Updating...' : 'Re-submit Payment Reference'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
              {/* Squad vs Solo Fields */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-white">
                  1. {isSquad ? 'Squad Roster Details' : 'Player Details'}
                </h3>

                {isSquad && (
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">
                      Squad / Team Name *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={VALIDATION_RULES.MAX_TEAM_LEN}
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="e.g. Vanguard Four"
                      className="w-full bg-[#0D0E12] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">
                      {isSquad ? 'Captain In-Game Name (IGN) *' : 'Free Fire IGN *'}
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={VALIDATION_RULES.MAX_IGN_LEN}
                      value={leaderIgn}
                      onChange={(e) => setLeaderIgn(e.target.value)}
                      placeholder="e.g. TXP·KiraFF"
                      className="w-full bg-[#0D0E12] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">
                      {isSquad ? 'Captain Free Fire UID *' : 'Free Fire UID *'}
                    </label>
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      maxLength={VALIDATION_RULES.MAX_UID_LEN}
                      value={leaderUid}
                      onChange={(e) => setLeaderUid(e.target.value)}
                      placeholder="e.g. 2489104512"
                      className="w-full bg-[#0D0E12] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {isSquad && (
                  <div className="space-y-3 pt-1">
                    <p className="text-xs text-zinc-400">
                      Squadmates (Teammate 2 required; 3 &amp; 4 optional substitute)
                    </p>
                    {[
                      {
                        label: 'Player 2',
                        ign: p2Ign,
                        setIgn: setP2Ign,
                        uid: p2Uid,
                        setUid: setP2Uid,
                        req: true,
                      },
                      {
                        label: 'Player 3',
                        ign: p3Ign,
                        setIgn: setP3Ign,
                        uid: p3Uid,
                        setUid: setP3Uid,
                        req: false,
                      },
                      {
                        label: 'Player 4',
                        ign: p4Ign,
                        setIgn: setP4Ign,
                        uid: p4Uid,
                        setUid: setP4Uid,
                        req: false,
                      },
                    ].map((slot) => (
                      <div key={slot.label} className="grid sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          required={slot.req}
                          maxLength={30}
                          value={slot.ign}
                          onChange={(e) => slot.setIgn(e.target.value)}
                          placeholder={`${slot.label} IGN${slot.req ? ' *' : ''}`}
                          className="w-full bg-[#0D0E12] border border-white/15 rounded-lg px-3.5 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                        />
                        <input
                          type="text"
                          required={slot.req}
                          inputMode="numeric"
                          maxLength={20}
                          value={slot.uid}
                          onChange={(e) => slot.setUid(e.target.value)}
                          placeholder={`${slot.label} Numeric UID${slot.req ? ' *' : ''}`}
                          className="w-full bg-[#0D0E12] border border-white/15 rounded-lg px-3.5 py-2 text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">
                    Contact Phone Number (for slot &amp; prize payout updates) *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={VALIDATION_RULES.MAX_PHONE_LEN}
                    value={whatsappPhone}
                    onChange={(e) => setWhatsappPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full bg-[#0D0E12] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Payment System */}
              <div className="pt-4 border-t border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">2. Entry Fee Payment</h3>
                  <span className="font-mono text-sm font-semibold text-orange-400 tabular-nums">
                    {isFree ? 'FREE ENTRY' : `₹${tournament.entryFee}`}
                  </span>
                </div>

                {isFree ? (
                  <div className="bg-[#0D0E12] border border-white/10 rounded-lg p-4 text-xs text-zinc-300">
                    No entry fee required for this community tournament. Submit your roster
                    to reserve a slot pending admin confirmation.
                  </div>
                ) : (
                  <>
                    {/* Payment Mode Selector: Wallet vs UPI */}
                    {user && (
                      <div className="grid sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('Wallet')}
                          className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                            paymentMethod === 'Wallet'
                              ? 'bg-orange-500/15 border-orange-500 text-white'
                              : 'bg-[#0D0E12] border-white/10 text-zinc-300 hover:border-white/25'
                          }`}
                        >
                          <p className="text-xs font-semibold">Pay from TXP Wallet</p>
                          <p className="font-mono text-xs text-orange-400 tabular-nums mt-1">
                            Balance: ₹{(wallet?.balance ?? 0).toLocaleString('en-IN')} · Instant Verify
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('UPI QR')}
                          className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                            paymentMethod !== 'Wallet'
                              ? 'bg-orange-500/15 border-orange-500 text-white'
                              : 'bg-[#0D0E12] border-white/10 text-zinc-300 hover:border-white/25'
                          }`}
                        >
                          <p className="text-xs font-semibold">Pay via UPI ID / App</p>
                          <p className="font-mono text-xs text-zinc-400 mt-1 truncate">
                            {settings.upiId} · UTR Check
                          </p>
                        </button>
                      </div>
                    )}

                    {paymentMethod === 'Wallet' ? (
                      <div className="bg-[#0D0E12] border border-white/10 rounded-lg p-4 space-y-1.5 text-xs">
                        {(wallet?.balance ?? 0) >= tournament.entryFee ? (
                          <p className="text-emerald-400 font-medium">
                            ₹{tournament.entryFee} will be deducted from your TXP Wallet for
                            instant verification.
                          </p>
                        ) : (
                          <p className="text-amber-400">
                            Your wallet balance (₹{wallet?.balance ?? 0}) is below ₹
                            {tournament.entryFee}. Top up in the Wallet section or switch to
                            UPI ID payment above.
                          </p>
                        )}
                      </div>
                    ) : (
                      <>
                        <UpiPaymentBox
                          upiId={settings.upiId}
                          upiName={settings.upiName}
                          amount={tournament.entryFee}
                          note={`${tournament.title} - ${leaderIgn || 'Player'}`}
                        />

                        <div className="grid sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-zinc-400 mb-1.5">
                              Payment App Used *
                            </label>
                            <select
                              value={paymentMethod}
                              onChange={(e) =>
                                setPaymentMethod(e.target.value as PaymentMethod)
                              }
                              className="w-full bg-[#0D0E12] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                            >
                              <option value="UPI QR">UPI App</option>
                              <option value="GPay">GPay</option>
                              <option value="PhonePe">PhonePe</option>
                              <option value="Paytm">Paytm</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-zinc-400 mb-1.5">
                              12-Digit UTR / Transaction Ref *
                            </label>
                            <input
                              type="text"
                              required
                              maxLength={VALIDATION_RULES.MAX_UTR_LEN}
                              value={paymentUtr}
                              onChange={(e) => setPaymentUtr(e.target.value)}
                              placeholder="e.g. 432510984512"
                              className="w-full bg-[#0D0E12] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-lg text-xs text-red-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-zinc-400">
                  {user
                    ? `Submitting as ${user.email}`
                    : 'Sign in with Google to bind your registration and unlock Room ID access.'}
                </p>
                <button
                  type="submit"
                  disabled={submitting || signingIn}
                  className="px-6 py-2.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-zinc-950 font-semibold text-sm rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {!user
                    ? signingIn
                      ? 'Signing In...'
                      : 'Sign In & Submit Entry'
                    : submitting
                    ? 'Submitting...'
                    : 'Confirm Registration'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
