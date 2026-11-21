import React, { useState } from 'react';
import { doc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { ArrowDownLeft, ArrowUpRight, ShieldAlert, Wallet as WalletIcon } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useFirebase } from '../context/FirebaseContext';
import { VALIDATION_RULES } from '../types';
import { UpiPaymentBox } from './UpiPaymentBox';

export function WalletSection() {
  const {
    user,
    signingIn,
    signInWithGoogle,
    wallet,
    walletLoading,
    myWalletTransactions,
    settings,
  } = useFirebase();

  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [depositAmount, setDepositAmount] = useState('100');
  const [depositUtr, setDepositUtr] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('100');
  const [withdrawUpi, setWithdrawUpi] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  const parsedDeposit = Math.max(0, Math.round(Number(depositAmount) || 0));

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setFeedback(null);

    const amount = Math.round(Number(depositAmount) || 0);
    const cleanUtr = depositUtr.trim();

    if (amount < 10 || amount > 50000) {
      setFeedback({ type: 'err', text: 'Deposit amount must be between ₹10 and ₹50,000.' });
      return;
    }
    if (
      cleanUtr.length < VALIDATION_RULES.MIN_UTR_LEN ||
      cleanUtr.length > VALIDATION_RULES.MAX_UTR_LEN ||
      !VALIDATION_RULES.UTR_PATTERN.test(cleanUtr)
    ) {
      setFeedback({
        type: 'err',
        text: 'Enter a valid UPI UTR / Reference ID (letters, numbers, hyphen or underscore).',
      });
      return;
    }

    const txId = `dep_${Date.now().toString(36)}_${user.uid.slice(0, 6)}`;
    setSubmitting(true);
    try {
      const now = serverTimestamp();
      await setDoc(doc(db, 'walletTransactions', txId), {
        userId: user.uid,
        userEmail: (user.email || 'player@txpesports.com').slice(0, 120),
        type: 'deposit',
        amount,
        status: 'pending',
        utrOrUpi: cleanUtr,
        tournamentId: '',
        note: 'UPI wallet top-up request',
        createdAt: now,
        updatedAt: now,
      });
      setDepositUtr('');
      setFeedback({
        type: 'ok',
        text: `Top-up request for ₹${amount} submitted. Balance credits automatically once admin verifies UTR ${cleanUtr}.`,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `walletTransactions/${txId}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !wallet) return;
    setFeedback(null);

    const amount = Math.round(Number(withdrawAmount) || 0);
    const cleanUpi = withdrawUpi.trim();

    if (amount < 20 || amount > 50000) {
      setFeedback({
        type: 'err',
        text: 'Minimum withdrawal is ₹20 and maximum is ₹50,000.',
      });
      return;
    }
    if (amount > wallet.balance) {
      setFeedback({
        type: 'err',
        text: `Insufficient wallet balance (available: ₹${wallet.balance}).`,
      });
      return;
    }
    if (!VALIDATION_RULES.UPI_PATTERN.test(cleanUpi)) {
      setFeedback({
        type: 'err',
        text: 'Enter a valid destination UPI ID (e.g. name@oksbi).',
      });
      return;
    }

    const txId = `wdr_${Date.now().toString(36)}_${user.uid.slice(0, 6)}`;
    setSubmitting(true);
    try {
      const batch = writeBatch(db);
      const now = serverTimestamp();

      batch.set(doc(db, 'walletTransactions', txId), {
        userId: user.uid,
        userEmail: (user.email || 'player@txpesports.com').slice(0, 120),
        type: 'withdrawal',
        amount,
        status: 'pending',
        utrOrUpi: cleanUpi,
        tournamentId: '',
        note: 'Withdrawal request to player UPI',
        createdAt: now,
        updatedAt: now,
      });

      batch.update(doc(db, 'wallets', user.uid), {
        balance: wallet.balance - amount,
        lastTxId: txId,
        updatedAt: now,
      });

      await batch.commit();
      setWithdrawUpi('');
      setFeedback({
        type: 'ok',
        text: `Withdrawal of ₹${amount} to ${cleanUpi} submitted. Admin will process payout shortly.`,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `walletTransactions/${txId}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="wallet" className="py-20 border-t border-white/10 bg-[#09090B]">
      <div className="max-w-7xl mx-auto px-6 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-medium text-orange-400">
              03. Instant Entry &amp; Prize Wallet
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-white text-balance">
              TXP Player Wallet
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Add funds via UPI ({settings.upiId}) for instant tournament slot verification,
              receive prize winnings directly, or withdraw to your UPI ID.
            </p>
          </div>

          {!user && (
            <button
              type="button"
              disabled={signingIn}
              onClick={() => void signInWithGoogle()}
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-400 text-zinc-950 font-semibold text-sm rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {signingIn ? 'Signing In...' : 'Sign In to Open Wallet'}
            </button>
          )}
        </div>

        {!user ? (
          <div className="bg-[#121318] border border-white/10 rounded-xl p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2 text-zinc-200 font-semibold">
                <WalletIcon className="w-4 h-4 text-orange-400 shrink-0" />
                <span>Sign in to access your balance &amp; payouts</span>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Your wallet stores verified top-ups and tournament prize credits for one-tap
                instant tournament entry and fast UPI withdrawals.
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
        ) : (
          <div className="space-y-8">
            {/* Balance Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#121318] border border-orange-500/30 rounded-xl p-5">
                <p className="text-xs text-zinc-400">Available Balance</p>
                <p className="font-mono text-3xl font-semibold text-orange-400 tabular-nums mt-1">
                  {walletLoading ? '...' : `₹${(wallet?.balance ?? 0).toLocaleString('en-IN')}`}
                </p>
              </div>
              <div className="bg-[#121318] border border-white/10 rounded-xl p-5">
                <p className="text-xs text-zinc-400">Total Deposited</p>
                <p className="font-mono text-2xl font-semibold text-white tabular-nums mt-1">
                  ₹{(wallet?.totalDeposited ?? 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="bg-[#121318] border border-white/10 rounded-xl p-5">
                <p className="text-xs text-zinc-400">Total Winnings</p>
                <p className="font-mono text-2xl font-semibold text-emerald-400 tabular-nums mt-1">
                  ₹{(wallet?.totalWon ?? 0).toLocaleString('en-IN')}
                </p>
              </div>
              <div className="bg-[#121318] border border-white/10 rounded-xl p-5">
                <p className="text-xs text-zinc-400">Total Withdrawn</p>
                <p className="font-mono text-2xl font-semibold text-zinc-300 tabular-nums mt-1">
                  ₹{(wallet?.totalWithdrawn ?? 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 items-start">
              {/* Left: Deposit / Withdraw Form */}
              <div className="lg:col-span-6 bg-[#121318] border border-white/10 rounded-xl p-6 space-y-5">
                <div className="inline-flex items-center gap-1 p-1 bg-[#09090B] border border-white/10 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('deposit');
                      setFeedback(null);
                    }}
                    className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      mode === 'deposit'
                        ? 'bg-orange-500 text-zinc-950 font-semibold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Add Money (UPI)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('withdraw');
                      setFeedback(null);
                    }}
                    className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      mode === 'withdraw'
                        ? 'bg-orange-500 text-zinc-950 font-semibold'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Withdraw to UPI
                  </button>
                </div>

                {mode === 'deposit' ? (
                  <form onSubmit={(e) => void handleDepositSubmit(e)} className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-xs text-zinc-400">
                        Select or Enter Deposit Amount (₹10 – ₹50,000)
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[50, 100, 250, 500].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setDepositAmount(String(preset))}
                            className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-colors cursor-pointer ${
                              parsedDeposit === preset
                                ? 'bg-orange-500/20 border-orange-500 text-orange-300'
                                : 'bg-[#09090B] border-white/10 text-zinc-300 hover:border-white/25'
                            }`}
                          >
                            ₹{preset}
                          </button>
                        ))}
                      </div>
                      <input
                        type="number"
                        min={10}
                        max={50000}
                        required
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        className="w-full bg-[#09090B] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    {parsedDeposit >= 10 && (
                      <UpiPaymentBox
                        upiId={settings.upiId}
                        upiName={settings.upiName}
                        amount={parsedDeposit}
                        note={`TXP Wallet Topup - ${user.email || user.uid}`}
                      />
                    )}

                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">
                        12-Digit UPI UTR / Reference Number *
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={VALIDATION_RULES.MAX_UTR_LEN}
                        value={depositUtr}
                        onChange={(e) => setDepositUtr(e.target.value)}
                        placeholder="e.g. 432510984512"
                        className="w-full bg-[#09090B] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-zinc-950 font-semibold text-sm rounded-lg transition-colors cursor-pointer"
                    >
                      {submitting ? 'Submitting...' : 'Submit Deposit Request'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={(e) => void handleWithdrawSubmit(e)} className="space-y-4">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">
                        Withdrawal Amount (Min ₹20 · Available ₹{wallet?.balance ?? 0})
                      </label>
                      <input
                        type="number"
                        min={20}
                        max={Math.max(20, wallet?.balance ?? 0)}
                        required
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="w-full bg-[#09090B] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-zinc-400 mb-1.5">
                        Your Receiving UPI ID *
                      </label>
                      <input
                        type="text"
                        required
                        value={withdrawUpi}
                        onChange={(e) => setWithdrawUpi(e.target.value)}
                        placeholder="e.g. playername@oksbi"
                        className="w-full bg-[#09090B] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                      />
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Requested funds are held securely from your available balance while an
                      admin processes the UPI transfer. Rejected requests refund
                      automatically.
                    </p>

                    <button
                      type="submit"
                      disabled={submitting || (wallet?.balance ?? 0) < 20}
                      className="w-full py-2.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-zinc-950 font-semibold text-sm rounded-lg transition-colors cursor-pointer"
                    >
                      {submitting ? 'Processing...' : 'Request UPI Withdrawal'}
                    </button>
                  </form>
                )}

                {feedback && (
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                      feedback.type === 'ok'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                        : 'bg-red-500/10 border-red-500/30 text-red-300'
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{feedback.text}</span>
                  </div>
                )}
              </div>

              {/* Right: Transaction Ledger */}
              <div className="lg:col-span-6 bg-[#121318] border border-white/10 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-2xl font-bold text-white">
                    Wallet Ledger
                  </h3>
                  <span className="text-xs text-zinc-400 tabular-nums">
                    {myWalletTransactions.length} Entries
                  </span>
                </div>

                {myWalletTransactions.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <p className="text-sm text-zinc-400">No wallet transactions yet.</p>
                    <p className="text-xs text-zinc-500">
                      Add funds via UPI or win tournament prizes to view your ledger.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5 max-h-[420px] overflow-y-auto pr-1">
                    {myWalletTransactions.map((tx) => {
                      const isCredit = tx.type === 'deposit' || tx.type === 'prize_credit';
                      return (
                        <div
                          key={tx.id}
                          className="py-3.5 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="mt-0.5 p-1.5 rounded-md bg-[#09090B] border border-white/10 text-zinc-300 shrink-0">
                              {isCredit ? (
                                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <ArrowUpRight className="w-4 h-4 text-orange-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-white capitalize truncate">
                                {tx.type.replace('_', ' ')}
                              </p>
                              <p className="text-xs text-zinc-400 truncate mt-0.5">
                                {tx.note} · <span className="font-mono">{tx.utrOrUpi}</span>
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <p
                              className={`font-mono text-sm font-semibold tabular-nums ${
                                isCredit ? 'text-emerald-400' : 'text-zinc-200'
                              }`}
                            >
                              {isCredit ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                            </p>
                            <p
                              className={`text-[11px] font-medium capitalize mt-0.5 ${
                                tx.status === 'approved'
                                  ? 'text-emerald-400'
                                  : tx.status === 'rejected'
                                  ? 'text-red-400'
                                  : 'text-amber-400'
                              }`}
                            >
                              {tx.status}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
