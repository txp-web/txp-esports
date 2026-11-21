import React, { useEffect, useMemo, useState } from 'react';
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { Check, Plus, Trash2, X } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useFirebase } from '../context/FirebaseContext';
import {
  MapName,
  PaymentStatus,
  Registration,
  RoomAccess,
  StandingRow,
  Tournament,
  TournamentMode,
  TournamentStatus,
  VALIDATION_RULES,
  WalletTransaction,
} from '../types';

type AdminTab =
  | 'tournaments'
  | 'registrations'
  | 'wallet'
  | 'rooms'
  | 'results'
  | 'settings';

interface AdminPanelProps {
  onExitAdmin: () => void;
}

export function AdminPanel({ onExitAdmin }: AdminPanelProps) {
  const {
    user,
    isAdmin,
    tournaments,
    allRegistrations,
    results,
    settings,
    allWallets,
    allWalletTransactions,
    seedStarterData,
    seeding,
  } = useFirebase();

  const [activeTab, setActiveTab] = useState<AdminTab>('tournaments');
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(
    null
  );

  // Create Tournament state
  const [tTitle, setTTitle] = useState('');
  const [tMode, setTMode] = useState<TournamentMode>('Squad');
  const [tMap, setTMap] = useState<MapName>('Bermuda');
  const [tEntryFee, setTEntryFee] = useState('100');
  const [tPrizePool, setTPrizePool] = useState('5000');
  const [tPerKill, setTPerKill] = useState('25');
  const [tMaxSlots, setTMaxSlots] = useState('12');
  const [tStartTime, setTStartTime] = useState('Tomorrow · 8:30 PM IST');
  const [tRules, setTRules] = useState(
    'Mobile devices only. Emulators and unauthorized tools prohibited. Screen recording required for top 3.'
  );
  const [creatingTournament, setCreatingTournament] = useState(false);

  // Registrations filter state
  const [regSearch, setRegSearch] = useState('');
  const [regStatusFilter, setRegStatusFilter] = useState<'all' | PaymentStatus>('all');
  const [regTournamentFilter, setRegTournamentFilter] = useState<string>('all');
  const [slotInputs, setSlotInputs] = useState<Record<string, string>>({});
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  // Room Credentials state
  const [roomTournamentId, setRoomTournamentId] = useState<string>('');
  const [roomIdVal, setRoomIdVal] = useState('');
  const [roomPassVal, setRoomPassVal] = useState('');
  const [roomInstructions, setRoomInstructions] = useState(
    'Join 10 minutes before start time and occupy your assigned slot.'
  );
  const [roomReleased, setRoomReleased] = useState(false);
  const [loadingRoom, setLoadingRoom] = useState(false);
  const [savingRoom, setSavingRoom] = useState(false);

  // Publish Results state
  const [resTournamentId, setResTournamentId] = useState<string>('');
  const [resMatchDate, setResMatchDate] = useState('Nov 20, 2026');
  const [resMvp, setResMvp] = useState('');
  const [resRows, setResRows] = useState<StandingRow[]>([
    {
      rank: 1,
      name: '',
      kills: 10,
      placementPoints: 12,
      killPoints: 10,
      totalPoints: 22,
      prizeWon: 2500,
    },
    {
      rank: 2,
      name: '',
      kills: 7,
      placementPoints: 9,
      killPoints: 7,
      totalPoints: 16,
      prizeWon: 1500,
    },
    {
      rank: 3,
      name: '',
      kills: 5,
      placementPoints: 8,
      killPoints: 5,
      totalPoints: 13,
      prizeWon: 1000,
    },
  ]);
  const [publishingResult, setPublishingResult] = useState(false);

  // Settings state
  const [upiId, setUpiId] = useState(settings.upiId);
  const [upiName, setUpiName] = useState(settings.upiName);
  const [supportPhone, setSupportPhone] = useState(settings.whatsappNumber);

  // Admin Wallet Credit state
  const [creditUserId, setCreditUserId] = useState('');
  const [creditAmount, setCreditAmount] = useState('100');
  const [creditNote, setCreditNote] = useState('Tournament Prize Payout');
  const [processingWallet, setProcessingWallet] = useState(false);
  const [communityUrl, setCommunityUrl] = useState(settings.whatsappGroupUrl);
  const [announcement, setAnnouncement] = useState(settings.announcement);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    setUpiId(settings.upiId);
    setUpiName(settings.upiName);
    setSupportPhone(settings.whatsappNumber);
    setCommunityUrl(settings.whatsappGroupUrl);
    setAnnouncement(settings.announcement);
  }, [settings]);

  useEffect(() => {
    if (!roomTournamentId && tournaments.length > 0) {
      setRoomTournamentId(tournaments[0].id);
    }
    if (!resTournamentId && tournaments.length > 0) {
      setResTournamentId(tournaments[0].id);
    }
  }, [tournaments, roomTournamentId, resTournamentId]);

  useEffect(() => {
    if (!roomTournamentId || !isAdmin) return;
    let active = true;
    setLoadingRoom(true);
    const path = `tournaments/${roomTournamentId}/roomAccess/credentials`;
    getDoc(doc(db, 'tournaments', roomTournamentId, 'roomAccess', 'credentials'))
      .then((snap) => {
        if (!active) return;
        if (snap.exists()) {
          const data = snap.data() as RoomAccess;
          setRoomIdVal(data.roomId);
          setRoomPassVal(data.roomPassword);
          setRoomInstructions(data.instructions);
          setRoomReleased(data.released);
        } else {
          setRoomIdVal('');
          setRoomPassVal('');
          setRoomInstructions(
            'Join 10 minutes before start time and occupy your assigned slot.'
          );
          setRoomReleased(false);
        }
      })
      .catch((error) => handleFirestoreError(error, OperationType.GET, path))
      .finally(() => {
        if (active) setLoadingRoom(false);
      });

    return () => {
      active = false;
    };
  }, [roomTournamentId, isAdmin]);

  const filteredRegistrations = useMemo(() => {
    return allRegistrations.filter((r) => {
      if (regStatusFilter !== 'all' && r.paymentStatus !== regStatusFilter) {
        return false;
      }
      if (regTournamentFilter !== 'all' && r.tournamentId !== regTournamentFilter) {
        return false;
      }
      if (regSearch.trim()) {
        const q = regSearch.toLowerCase();
        const hay = `${r.teamName} ${r.leaderIgn} ${r.leaderUid} ${r.paymentUtr} ${r.whatsappPhone}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allRegistrations, regStatusFilter, regTournamentFilter, regSearch]);

  if (!user || !isAdmin) {
    return (
      <section className="max-w-3xl mx-auto px-6 py-24 text-center space-y-4">
        <h1 className="font-display text-3xl font-bold text-white">
          Admin Access Restricted
        </h1>
        <p className="text-sm text-zinc-400">
          Sign in with an authorized administrator account to manage tournaments,
          payments, room credentials, and match results.
        </p>
        <button
          type="button"
          onClick={onExitAdmin}
          className="px-5 py-2.5 bg-orange-500 text-zinc-950 font-semibold text-sm rounded-lg cursor-pointer"
        >
          Return to Public Site
        </button>
      </section>
    );
  }

  const showNotice = (type: 'ok' | 'err', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = tTitle.trim();
    if (cleanTitle.length < 3 || cleanTitle.length > VALIDATION_RULES.MAX_TITLE_LEN) {
      showNotice('err', 'Tournament title must be between 3 and 100 characters.');
      return;
    }

    const entryFee = Math.max(0, Math.min(50000, Number(tEntryFee) || 0));
    const prizePool = Math.max(0, Math.min(5000000, Number(tPrizePool) || 0));
    const perKillPrize = Math.max(0, Math.min(10000, Number(tPerKill) || 0));
    const maxSlots = Math.max(2, Math.min(100, Math.round(Number(tMaxSlots) || 12)));

    const slugBase = cleanTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
    const id = `${slugBase || 'txp-match'}-${Date.now().toString(36)}`;

    setCreatingTournament(true);
    try {
      const batch = writeBatch(db);
      const now = serverTimestamp();

      batch.set(doc(db, 'tournaments', id), {
        title: cleanTitle,
        mode: tMode,
        mapName: tMap,
        entryFee,
        prizePool,
        perKillPrize,
        maxSlots,
        startTime: tStartTime.trim().slice(0, 60) || 'Scheduled',
        status: 'upcoming',
        roomReleased: false,
        rulesSummary: tRules.trim().slice(0, VALIDATION_RULES.MAX_RULES_LEN),
        createdBy: user.uid,
        createdAt: now,
        updatedAt: now,
      });

      batch.set(doc(db, 'tournaments', id, 'roomAccess', 'credentials'), {
        tournamentId: id,
        roomId: 'PENDING',
        roomPassword: 'PENDING',
        instructions: 'Join 10 minutes before match start.',
        released: false,
        updatedBy: user.uid,
        updatedAt: now,
      });

      await batch.commit();
      setTTitle('');
      showNotice('ok', `Created "${cleanTitle}" successfully.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `tournaments/${id}`);
    } finally {
      setCreatingTournament(false);
    }
  };

  const handleUpdateTournamentStatus = async (
    t: Tournament,
    nextStatus: TournamentStatus
  ) => {
    try {
      await updateDoc(doc(db, 'tournaments', t.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
      showNotice('ok', `Updated "${t.title}" status to ${nextStatus}.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tournaments/${t.id}`);
    }
  };

  const handleDeleteTournament = async (t: Tournament) => {
    try {
      await deleteDoc(doc(db, 'tournaments', t.id));
      showNotice('ok', `Deleted tournament "${t.title}".`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tournaments/${t.id}`);
    }
  };

  const handleRegistrationDecision = async (
    reg: Registration,
    nextStatus: PaymentStatus
  ) => {
    const rawSlot = slotInputs[reg.id];
    const parsedSlot =
      rawSlot !== undefined
        ? Math.max(0, Math.min(100, Math.round(Number(rawSlot) || 0)))
        : reg.slotNumber ||
          (nextStatus === 'verified'
            ? allRegistrations.filter(
                (r) => r.tournamentId === reg.tournamentId && r.paymentStatus === 'verified'
              ).length + 1
            : 0);

    const adminNote = (noteInputs[reg.id] ?? reg.adminNote ?? '').slice(
      0,
      VALIDATION_RULES.MAX_ADMIN_NOTE_LEN
    );

    try {
      const batch = writeBatch(db);
      const now = serverTimestamp();

      batch.update(doc(db, 'registrations', reg.id), {
        paymentStatus: nextStatus,
        slotNumber: nextStatus === 'verified' ? parsedSlot : 0,
        adminNote,
        updatedAt: now,
      });

      batch.update(
        doc(db, 'tournaments', reg.tournamentId, 'publicSlots', reg.id),
        {
          paymentStatus: nextStatus,
          slotNumber: nextStatus === 'verified' ? parsedSlot : 0,
          updatedAt: now,
        }
      );

      await batch.commit();
      showNotice(
        'ok',
        `${reg.teamName || reg.leaderIgn} marked as ${nextStatus}${
          nextStatus === 'verified' ? ` (Slot #${parsedSlot})` : ''
        }.`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `registrations/${reg.id}`);
    }
  };

  const handleDeleteRegistration = async (reg: Registration) => {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'registrations', reg.id));
      batch.delete(
        doc(db, 'tournaments', reg.tournamentId, 'publicSlots', reg.id)
      );
      await batch.commit();
      showNotice('ok', `Removed registration for ${reg.teamName || reg.leaderIgn}.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `registrations/${reg.id}`);
    }
  };

  const handleSaveRoomCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomTournamentId) return;
    if (!roomIdVal.trim() || !roomPassVal.trim()) {
      showNotice('err', 'Both Room ID and Room Password are required.');
      return;
    }

    setSavingRoom(true);
    try {
      const batch = writeBatch(db);
      const now = serverTimestamp();

      batch.set(
        doc(db, 'tournaments', roomTournamentId, 'roomAccess', 'credentials'),
        {
          tournamentId: roomTournamentId,
          roomId: roomIdVal.trim().slice(0, 40),
          roomPassword: roomPassVal.trim().slice(0, 40),
          instructions: roomInstructions
            .trim()
            .slice(0, VALIDATION_RULES.MAX_INSTRUCTIONS_LEN),
          released: roomReleased,
          updatedBy: user.uid,
          updatedAt: now,
        }
      );

      batch.update(doc(db, 'tournaments', roomTournamentId), {
        roomReleased,
        updatedAt: now,
      });

      await batch.commit();
      showNotice(
        'ok',
        roomReleased
          ? 'Room ID & Password saved and released to verified players!'
          : 'Room credentials saved (kept hidden until released).'
      );
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.WRITE,
        `tournaments/${roomTournamentId}/roomAccess/credentials`
      );
    } finally {
      setSavingRoom(false);
    }
  };

  const handlePublishResult = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetTournament = tournaments.find((t) => t.id === resTournamentId);
    if (!targetTournament) {
      showNotice('err', 'Select a tournament first.');
      return;
    }

    const validRows = resRows
      .filter((r) => r.name.trim().length > 0)
      .map((r, idx) => ({
        rank: Math.max(1, Math.round(Number(r.rank) || idx + 1)),
        name: r.name.trim().slice(0, 60),
        kills: Math.max(0, Math.round(Number(r.kills) || 0)),
        placementPoints: Math.max(0, Math.round(Number(r.placementPoints) || 0)),
        killPoints: Math.max(0, Math.round(Number(r.killPoints) || 0)),
        totalPoints:
          Math.max(0, Math.round(Number(r.placementPoints) || 0)) +
          Math.max(0, Math.round(Number(r.killPoints) || 0)),
        prizeWon: Math.max(0, Number(r.prizeWon) || 0),
      }));

    if (validRows.length === 0) {
      showNotice('err', 'Add at least 1 player or squad standing row.');
      return;
    }

    const totalPrize = validRows.reduce((acc, r) => acc + r.prizeWon, 0);
    const resultId = `res-${targetTournament.id}-${Date.now().toString(36)}`;

    setPublishingResult(true);
    try {
      const batch = writeBatch(db);
      const now = serverTimestamp();

      batch.set(doc(db, 'results', resultId), {
        tournamentId: targetTournament.id,
        tournamentTitle: targetTournament.title,
        mode: targetTournament.mode,
        mapName: targetTournament.mapName,
        matchDate: resMatchDate.trim().slice(0, 60) || 'Today',
        mvpPlayer: (resMvp.trim() || validRows[0].name).slice(0, 60),
        prizeDistributed: totalPrize,
        standings: validRows.slice(0, 25),
        publishedBy: user.uid,
        createdAt: now,
        updatedAt: now,
      });

      batch.update(doc(db, 'tournaments', targetTournament.id), {
        status: 'completed',
        updatedAt: now,
      });

      await batch.commit();
      showNotice('ok', `Published official results for "${targetTournament.title}".`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `results/${resultId}`);
    } finally {
      setPublishingResult(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUpi = upiId.trim();
    const cleanPhone = supportPhone.trim();

    if (!VALIDATION_RULES.UPI_PATTERN.test(cleanUpi)) {
      showNotice('err', 'Enter a valid UPI ID (e.g. gajjar45@fam).');
      return;
    }
    if (!VALIDATION_RULES.PHONE_PATTERN.test(cleanPhone)) {
      showNotice('err', 'Enter a valid contact phone number.');
      return;
    }

    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'public'), {
        upiId: cleanUpi,
        upiName: upiName.trim().slice(0, 60) || 'TXP Esports',
        whatsappNumber: cleanPhone,
        whatsappGroupUrl: communityUrl.trim().slice(0, 250),
        announcement: announcement.trim().slice(0, 300),
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
      });
      showNotice('ok', 'Payment & platform settings updated.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/public');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleWalletTxDecision = async (
    tx: WalletTransaction,
    decision: 'approved' | 'rejected'
  ) => {
    if (tx.status !== 'pending') return;
    setProcessingWallet(true);
    try {
      const walletRef = doc(db, 'wallets', tx.userId);
      const walletSnap = await getDoc(walletRef);
      const now = serverTimestamp();
      const batch = writeBatch(db);

      batch.update(doc(db, 'walletTransactions', tx.id), {
        status: decision,
        note:
          decision === 'approved'
            ? `${tx.type === 'deposit' ? 'Credited' : 'Paid'} by Admin`
            : `${tx.note} (Rejected by Admin)`.slice(0, 200),
        updatedAt: now,
      });

      if (tx.type === 'deposit' && decision === 'approved') {
        if (walletSnap.exists()) {
          const cur = walletSnap.data();
          batch.update(walletRef, {
            balance: (Number(cur.balance) || 0) + tx.amount,
            totalDeposited: (Number(cur.totalDeposited) || 0) + tx.amount,
            lastTxId: tx.id,
            updatedAt: now,
          });
        } else {
          batch.set(walletRef, {
            userId: tx.userId,
            userEmail: tx.userEmail,
            balance: tx.amount,
            totalDeposited: tx.amount,
            totalWon: 0,
            totalWithdrawn: 0,
            lastTxId: tx.id,
            createdAt: now,
            updatedAt: now,
          });
        }
      } else if (tx.type === 'withdrawal') {
        if (walletSnap.exists()) {
          const cur = walletSnap.data();
          if (decision === 'approved') {
            batch.update(walletRef, {
              totalWithdrawn: (Number(cur.totalWithdrawn) || 0) + tx.amount,
              lastTxId: tx.id,
              updatedAt: now,
            });
          } else {
            // Refund held balance on rejection
            batch.update(walletRef, {
              balance: (Number(cur.balance) || 0) + tx.amount,
              lastTxId: tx.id,
              updatedAt: now,
            });
          }
        }
      }

      await batch.commit();
      showNotice(
        'ok',
        `${tx.type} of ₹${tx.amount} for ${tx.userEmail} marked as ${decision}.`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `walletTransactions/${tx.id}`);
    } finally {
      setProcessingWallet(false);
    }
  };

  const handleCreditPrize = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetWallet = allWallets.find((w) => w.userId === creditUserId);
    const amount = Math.round(Number(creditAmount) || 0);
    if (!targetWallet) {
      showNotice('err', 'Select a valid player wallet.');
      return;
    }
    if (amount <= 0 || amount > 500000) {
      showNotice('err', 'Prize credit amount must be between ₹1 and ₹500,000.');
      return;
    }

    const txId = `prz_${Date.now().toString(36)}_${targetWallet.userId.slice(0, 6)}`;
    setProcessingWallet(true);
    try {
      const batch = writeBatch(db);
      const now = serverTimestamp();

      batch.set(doc(db, 'walletTransactions', txId), {
        userId: targetWallet.userId,
        userEmail: targetWallet.userEmail,
        type: 'prize_credit',
        amount,
        status: 'approved',
        utrOrUpi: 'ADMIN_PRIZE',
        tournamentId: '',
        note: creditNote.trim().slice(0, 200) || 'Tournament Prize Payout',
        createdAt: now,
        updatedAt: now,
      });

      batch.update(doc(db, 'wallets', targetWallet.userId), {
        balance: targetWallet.balance + amount,
        totalWon: targetWallet.totalWon + amount,
        lastTxId: txId,
        updatedAt: now,
      });

      await batch.commit();
      showNotice('ok', `Credited ₹${amount} prize to ${targetWallet.userEmail}.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `walletTransactions/${txId}`);
    } finally {
      setProcessingWallet(false);
    }
  };

  const pendingCount = allRegistrations.filter(
    (r) => r.paymentStatus === 'pending'
  ).length;
  const pendingWalletCount = allWalletTransactions.filter(
    (t) => t.status === 'pending'
  ).length;

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 py-10">
      <div className="max-w-7xl mx-auto px-6 space-y-8">
        {/* Admin Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <p className="text-xs text-zinc-400">TXP Esports / Admin Console</p>
            <h1 className="font-display text-3xl font-bold text-white mt-1">
              Tournament Operations
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={seeding}
              onClick={() => void seedStarterData()}
              className="px-4 py-2 text-xs font-medium text-zinc-200 bg-[#14151A] hover:bg-[#1C1D24] border border-white/15 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {seeding ? 'Loading Starter Data...' : 'Load Starter Tournaments'}
            </button>
            <button
              type="button"
              onClick={onExitAdmin}
              className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-orange-500 hover:bg-orange-400 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Back to Public Site
            </button>
          </div>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#121318] border border-white/10 rounded-xl p-4">
            <p className="text-xs text-zinc-400">Active Tournaments</p>
            <p className="font-mono text-2xl font-semibold text-white tabular-nums mt-1">
              {tournaments.filter((t) => t.status !== 'completed').length}
            </p>
          </div>
          <div className="bg-[#121318] border border-white/10 rounded-xl p-4">
            <p className="text-xs text-zinc-400">Total Registrations</p>
            <p className="font-mono text-2xl font-semibold text-white tabular-nums mt-1">
              {allRegistrations.length}
            </p>
          </div>
          <div className="bg-[#121318] border border-white/10 rounded-xl p-4">
            <p className="text-xs text-zinc-400">Pending Payment Reviews</p>
            <p className="font-mono text-2xl font-semibold text-orange-400 tabular-nums mt-1">
              {pendingCount}
            </p>
          </div>
          <div className="bg-[#121318] border border-white/10 rounded-xl p-4">
            <p className="text-xs text-zinc-400">Published Results</p>
            <p className="font-mono text-2xl font-semibold text-white tabular-nums mt-1">
              {results.length}
            </p>
          </div>
        </div>

        {/* Segmented Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#121318] border border-white/10 rounded-lg w-fit">
          {(
            [
              { id: 'tournaments', label: 'Tournaments' },
              {
                id: 'registrations',
                label: `Registrations (${pendingCount})`,
              },
              {
                id: 'wallet',
                label: `Wallet & Payouts (${pendingWalletCount})`,
              },
              { id: 'rooms', label: 'Room ID & Password' },
              { id: 'results', label: 'Publish Results' },
              { id: 'settings', label: 'Payment Settings' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-orange-500 text-zinc-950 font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {notice && (
          <div
            className={`px-4 py-3 rounded-lg border text-xs font-medium ${
              notice.type === 'ok'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {notice.text}
          </div>
        )}

        {/* TAB 1: TOURNAMENTS */}
        {activeTab === 'tournaments' && (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <form
              onSubmit={(e) => void handleCreateTournament(e)}
              className="lg:col-span-5 bg-[#121318] border border-white/10 rounded-xl p-6 space-y-4"
            >
              <h2 className="font-display text-2xl font-bold text-white">
                Create Tournament
              </h2>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">
                  Tournament Title *
                </label>
                <input
                  type="text"
                  required
                  value={tTitle}
                  onChange={(e) => setTTitle(e.target.value)}
                  placeholder="e.g. TXP Sunday Squad Showdown"
                  className="w-full bg-[#09090B] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Mode</label>
                  <select
                    value={tMode}
                    onChange={(e) => setTMode(e.target.value as TournamentMode)}
                    className="w-full bg-[#09090B] border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="Squad">Squad</option>
                    <option value="Solo">Solo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Map</label>
                  <select
                    value={tMap}
                    onChange={(e) => setTMap(e.target.value as MapName)}
                    className="w-full bg-[#09090B] border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="Bermuda">Bermuda</option>
                    <option value="Purgatory">Purgatory</option>
                    <option value="Kalahari">Kalahari</option>
                    <option value="Bermuda Remastered">Bermuda Remastered</option>
                    <option value="Alpine">Alpine</option>
                    <option value="NeXTerra">NeXTerra</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">
                    Entry (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={tEntryFee}
                    onChange={(e) => setTEntryFee(e.target.value)}
                    className="w-full bg-[#09090B] border border-white/15 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">
                    Prize (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={tPrizePool}
                    onChange={(e) => setTPrizePool(e.target.value)}
                    className="w-full bg-[#09090B] border border-white/15 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">
                    Per Kill (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={tPerKill}
                    onChange={(e) => setTPerKill(e.target.value)}
                    className="w-full bg-[#09090B] border border-white/15 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">
                    Max Slots
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={100}
                    value={tMaxSlots}
                    onChange={(e) => setTMaxSlots(e.target.value)}
                    className="w-full bg-[#09090B] border border-white/15 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">
                  Start Date &amp; Time *
                </label>
                <input
                  type="text"
                  required
                  value={tStartTime}
                  onChange={(e) => setTStartTime(e.target.value)}
                  className="w-full bg-[#09090B] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">
                  Match Rules Summary
                </label>
                <textarea
                  rows={3}
                  value={tRules}
                  onChange={(e) => setTRules(e.target.value)}
                  className="w-full bg-[#09090B] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <button
                type="submit"
                disabled={creatingTournament}
                className="w-full py-2.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-zinc-950 font-semibold text-sm rounded-lg transition-colors cursor-pointer"
              >
                {creatingTournament ? 'Creating...' : 'Publish Tournament'}
              </button>
            </form>

            <div className="lg:col-span-7 bg-[#121318] border border-white/10 rounded-xl p-6 space-y-4">
              <h2 className="font-display text-2xl font-bold text-white">
                Manage Tournaments
              </h2>
              {tournaments.length === 0 ? (
                <p className="text-sm text-zinc-400 py-8 text-center">
                  No tournaments created yet. Create one or click Load Starter
                  Tournaments above.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-xs text-zinc-400">
                        <th className="py-2.5 pr-4 font-medium">Tournament</th>
                        <th className="py-2.5 px-3 font-medium">Mode</th>
                        <th className="py-2.5 px-3 text-right font-medium">Fee</th>
                        <th className="py-2.5 px-3 text-right font-medium">Prize</th>
                        <th className="py-2.5 px-3 font-medium">Status</th>
                        <th className="py-2.5 pl-3 text-right font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {tournaments.map((t) => (
                        <tr key={t.id} className="hover:bg-white/[0.02]">
                          <td className="py-3 pr-4">
                            <p className="font-medium text-white">{t.title}</p>
                            <p className="text-xs text-zinc-400">
                              {t.mapName} · {t.startTime}
                            </p>
                          </td>
                          <td className="py-3 px-3 text-zinc-300">{t.mode}</td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-zinc-300">
                            ₹{t.entryFee}
                          </td>
                          <td className="py-3 px-3 text-right font-mono tabular-nums text-orange-400">
                            ₹{t.prizePool.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3">
                            <select
                              value={t.status}
                              onChange={(e) =>
                                void handleUpdateTournamentStatus(
                                  t,
                                  e.target.value as TournamentStatus
                                )
                              }
                              className="bg-[#09090B] border border-white/15 rounded-md px-2 py-1 text-xs text-white"
                            >
                              <option value="upcoming">Upcoming</option>
                              <option value="live">Live</option>
                              <option value="completed">Completed</option>
                            </select>
                          </td>
                          <td className="py-3 pl-3 text-right">
                            <button
                              type="button"
                              onClick={() => void handleDeleteTournament(t)}
                              aria-label={`Delete ${t.title}`}
                              className="p-1.5 text-zinc-400 hover:text-red-400 rounded-md cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: REGISTRATIONS & PAYMENTS */}
        {activeTab === 'registrations' && (
          <div className="bg-[#121318] border border-white/10 rounded-xl p-6 space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="font-display text-2xl font-bold text-white">
                Player Registrations &amp; Payment Verification
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="text"
                  value={regSearch}
                  onChange={(e) => setRegSearch(e.target.value)}
                  placeholder="Search IGN, Team, UID, UTR..."
                  className="bg-[#09090B] border border-white/15 rounded-lg px-3.5 py-2 text-xs text-white w-56 focus:outline-none focus:border-orange-500"
                />
                <select
                  value={regTournamentFilter}
                  onChange={(e) => setRegTournamentFilter(e.target.value)}
                  className="bg-[#09090B] border border-white/15 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="all">All Tournaments</option>
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                <select
                  value={regStatusFilter}
                  onChange={(e) =>
                    setRegStatusFilter(e.target.value as 'all' | PaymentStatus)
                  }
                  className="bg-[#09090B] border border-white/15 rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {filteredRegistrations.length === 0 ? (
              <p className="text-sm text-zinc-400 py-10 text-center">
                No matching player registrations found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-xs text-zinc-400">
                      <th className="py-2.5 pr-4 font-medium">Player / Squad</th>
                      <th className="py-2.5 px-3 font-medium">Tournament</th>
                      <th className="py-2.5 px-3 font-medium">Payment UTR</th>
                      <th className="py-2.5 px-3 font-medium">Slot #</th>
                      <th className="py-2.5 px-3 font-medium">Note</th>
                      <th className="py-2.5 pl-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {filteredRegistrations.map((reg) => (
                      <tr key={reg.id} className="hover:bg-white/[0.02] align-top">
                        <td className="py-3.5 pr-4">
                          <p className="font-semibold text-white">
                            {reg.teamName || reg.leaderIgn}
                          </p>
                          <p className="text-xs text-zinc-400 font-mono mt-0.5">
                            {reg.leaderIgn} · UID {reg.leaderUid}
                          </p>
                          <p className="text-xs text-zinc-500 font-mono mt-0.5">
                            {reg.whatsappPhone}
                          </p>
                          {reg.squadMembers.length > 0 && (
                            <p className="text-[11px] text-zinc-500 mt-1">
                              Squad: {reg.squadMembers.join(', ')}
                            </p>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <p className="text-xs text-zinc-200 font-medium">
                            {reg.tournamentTitle}
                          </p>
                          <p
                            className={`text-xs font-semibold mt-1 capitalize ${
                              reg.paymentStatus === 'verified'
                                ? 'text-emerald-400'
                                : reg.paymentStatus === 'rejected'
                                ? 'text-red-400'
                                : 'text-amber-400'
                            }`}
                          >
                            {reg.paymentStatus}
                          </p>
                        </td>
                        <td className="py-3.5 px-3">
                          <p className="font-mono text-xs text-white">
                            {reg.paymentUtr}
                          </p>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            {reg.paymentMethod} · ₹{reg.amountPaid}
                          </p>
                        </td>
                        <td className="py-3.5 px-3">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={slotInputs[reg.id] ?? String(reg.slotNumber || '')}
                            onChange={(e) =>
                              setSlotInputs((prev) => ({
                                ...prev,
                                [reg.id]: e.target.value,
                              }))
                            }
                            placeholder="Slot"
                            className="w-16 bg-[#09090B] border border-white/15 rounded-md px-2 py-1 text-xs font-mono text-white"
                          />
                        </td>
                        <td className="py-3.5 px-3">
                          <input
                            type="text"
                            value={noteInputs[reg.id] ?? reg.adminNote ?? ''}
                            onChange={(e) =>
                              setNoteInputs((prev) => ({
                                ...prev,
                                [reg.id]: e.target.value,
                              }))
                            }
                            placeholder="Optional note"
                            className="w-36 bg-[#09090B] border border-white/15 rounded-md px-2 py-1 text-xs text-white"
                          />
                        </td>
                        <td className="py-3.5 pl-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                void handleRegistrationDecision(reg, 'verified')
                              }
                              title="Verify payment & assign slot"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium rounded-md cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Verify</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void handleRegistrationDecision(reg, 'rejected')
                              }
                              title="Reject payment"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-medium rounded-md cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteRegistration(reg)}
                              title="Delete registration"
                              className="p-1.5 text-zinc-400 hover:text-red-400 rounded-md cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ROOM CREDENTIALS */}
        {activeTab === 'rooms' && (
          <form
            onSubmit={(e) => void handleSaveRoomCredentials(e)}
            className="max-w-2xl bg-[#121318] border border-white/10 rounded-xl p-6 space-y-5"
          >
            <div>
              <h2 className="font-display text-2xl font-bold text-white">
                Custom Room ID &amp; Password Control
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Credentials remain encrypted by Firestore security rules until you enable
                release, and are only readable by verified players in that tournament.
              </p>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">
                Select Tournament
              </label>
              <select
                value={roomTournamentId}
                onChange={(e) => setRoomTournamentId(e.target.value)}
                className="w-full bg-[#09090B] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.mode} · {t.status})
                  </option>
                ))}
              </select>
            </div>

            {loadingRoom ? (
              <p className="text-xs text-zinc-400">Loading room credentials...</p>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">
                      Custom Room ID *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={40}
                      value={roomIdVal}
                      onChange={(e) => setRoomIdVal(e.target.value)}
                      placeholder="e.g. 92481054"
                      className="w-full bg-[#09090B] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1.5">
                      Room Password *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={40}
                      value={roomPassVal}
                      onChange={(e) => setRoomPassVal(e.target.value)}
                      placeholder="e.g. TXP889"
                      className="w-full bg-[#09090B] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">
                    Lobby Instructions
                  </label>
                  <textarea
                    rows={3}
                    maxLength={VALIDATION_RULES.MAX_INSTRUCTIONS_LEN}
                    value={roomInstructions}
                    onChange={(e) => setRoomInstructions(e.target.value)}
                    className="w-full bg-[#09090B] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>

                <label className="flex items-center gap-3 p-4 bg-[#09090B] border border-white/10 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={roomReleased}
                    onChange={(e) => setRoomReleased(e.target.checked)}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-white">
                      Release Room ID &amp; Password to Verified Players
                    </p>
                    <p className="text-xs text-zinc-400">
                      Turn this on 15 minutes before match drop.
                    </p>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={savingRoom}
                  className="px-6 py-2.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-zinc-950 font-semibold text-sm rounded-lg transition-colors cursor-pointer"
                >
                  {savingRoom ? 'Saving...' : 'Save Room Credentials'}
                </button>
              </>
            )}
          </form>
        )}

        {/* TAB 4: PUBLISH RESULTS */}
        {activeTab === 'results' && (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            <form
              onSubmit={(e) => void handlePublishResult(e)}
              className="lg:col-span-8 bg-[#121318] border border-white/10 rounded-xl p-6 space-y-5"
            >
              <h2 className="font-display text-2xl font-bold text-white">
                Publish Tournament Standings
              </h2>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">
                    Tournament
                  </label>
                  <select
                    value={resTournamentId}
                    onChange={(e) => setResTournamentId(e.target.value)}
                    className="w-full bg-[#09090B] border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white"
                  >
                    {tournaments.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">
                    Match Date
                  </label>
                  <input
                    type="text"
                    required
                    value={resMatchDate}
                    onChange={(e) => setResMatchDate(e.target.value)}
                    className="w-full bg-[#09090B] border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">
                    Match MVP
                  </label>
                  <input
                    type="text"
                    required
                    value={resMvp}
                    onChange={(e) => setResMvp(e.target.value)}
                    placeholder="e.g. TXP·KiraFF (12 Kills)"
                    className="w-full bg-[#09090B] border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-zinc-300">
                    Leaderboard Rows
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setResRows((prev) => [
                        ...prev,
                        {
                          rank: prev.length + 1,
                          name: '',
                          kills: 0,
                          placementPoints: 0,
                          killPoints: 0,
                          totalPoints: 0,
                          prizeWon: 0,
                        },
                      ])
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-orange-400 hover:text-orange-300 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Row</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {resRows.map((row, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center bg-[#09090B] border border-white/10 rounded-lg p-2.5"
                    >
                      <input
                        type="number"
                        min={1}
                        value={row.rank}
                        onChange={(e) => {
                          const val = Number(e.target.value) || 1;
                          setResRows((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, rank: val } : r))
                          );
                        }}
                        placeholder="#"
                        className="col-span-1 bg-[#14151A] border border-white/10 rounded px-2 py-1.5 text-xs font-mono text-white"
                      />
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setResRows((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, name: val } : r))
                          );
                        }}
                        placeholder="Squad or Player Name"
                        className="col-span-4 bg-[#14151A] border border-white/10 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                      <input
                        type="number"
                        min={0}
                        value={row.kills}
                        onChange={(e) => {
                          const kills = Number(e.target.value) || 0;
                          setResRows((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, kills, killPoints: kills } : r
                            )
                          );
                        }}
                        placeholder="Kills"
                        title="Kills"
                        className="col-span-2 bg-[#14151A] border border-white/10 rounded px-2 py-1.5 text-xs font-mono text-white"
                      />
                      <input
                        type="number"
                        min={0}
                        value={row.placementPoints}
                        onChange={(e) => {
                          const placementPoints = Number(e.target.value) || 0;
                          setResRows((prev) =>
                            prev.map((r, i) =>
                              i === idx ? { ...r, placementPoints } : r
                            )
                          );
                        }}
                        placeholder="Place Pts"
                        title="Placement Points"
                        className="col-span-2 bg-[#14151A] border border-white/10 rounded px-2 py-1.5 text-xs font-mono text-white"
                      />
                      <input
                        type="number"
                        min={0}
                        value={row.prizeWon}
                        onChange={(e) => {
                          const prizeWon = Number(e.target.value) || 0;
                          setResRows((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, prizeWon } : r))
                          );
                        }}
                        placeholder="Prize ₹"
                        title="Prize Won (₹)"
                        className="col-span-2 bg-[#14151A] border border-white/10 rounded px-2 py-1.5 text-xs font-mono text-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setResRows((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="col-span-1 flex justify-center text-zinc-500 hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={publishingResult}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-zinc-950 font-semibold text-sm rounded-lg transition-colors cursor-pointer"
              >
                {publishingResult ? 'Publishing...' : 'Publish Official Results'}
              </button>
            </form>

            <div className="lg:col-span-4 bg-[#121318] border border-white/10 rounded-xl p-6 space-y-4">
              <h3 className="font-display text-xl font-bold text-white">
                Published Standings
              </h3>
              {results.length === 0 ? (
                <p className="text-xs text-zinc-400">No published results yet.</p>
              ) : (
                <div className="space-y-3">
                  {results.map((r) => (
                    <div
                      key={r.id}
                      className="p-3.5 bg-[#09090B] border border-white/10 rounded-lg flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {r.tournamentTitle}
                        </p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {r.mode} · {r.matchDate}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await deleteDoc(doc(db, 'results', r.id));
                            showNotice('ok', 'Deleted result record.');
                          } catch (error) {
                            handleFirestoreError(
                              error,
                              OperationType.DELETE,
                              `results/${r.id}`
                            );
                          }
                        }}
                        className="p-1.5 text-zinc-500 hover:text-red-400 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2B: WALLET & PAYOUTS */}
        {activeTab === 'wallet' && (
          <div className="space-y-8">
            <div className="grid lg:grid-cols-12 gap-8 items-start">
              {/* Credit Prize Form */}
              <form
                onSubmit={(e) => void handleCreditPrize(e)}
                className="lg:col-span-4 bg-[#121318] border border-white/10 rounded-xl p-6 space-y-4"
              >
                <h2 className="font-display text-2xl font-bold text-white">
                  Credit Prize / Bonus
                </h2>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">
                    Select Player Wallet
                  </label>
                  <select
                    required
                    value={creditUserId}
                    onChange={(e) => setCreditUserId(e.target.value)}
                    className="w-full bg-[#09090B] border border-white/15 rounded-lg px-3 py-2.5 text-sm text-white"
                  >
                    <option value="">Choose player...</option>
                    {allWallets.map((w) => (
                      <option key={w.userId} value={w.userId}>
                        {w.userEmail} (Bal: ₹{w.balance})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">
                    Amount to Credit (₹)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500000}
                    required
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    className="w-full bg-[#09090B] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">
                    Reason / Match Note
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    value={creditNote}
                    onChange={(e) => setCreditNote(e.target.value)}
                    className="w-full bg-[#09090B] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={processingWallet || allWallets.length === 0}
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-zinc-950 font-semibold text-sm rounded-lg cursor-pointer"
                >
                  Credit Player Wallet
                </button>
              </form>

              {/* Wallet Transactions Queue */}
              <div className="lg:col-span-8 bg-[#121318] border border-white/10 rounded-xl p-6 space-y-4">
                <h2 className="font-display text-2xl font-bold text-white">
                  Deposit &amp; Withdrawal Requests
                </h2>
                {allWalletTransactions.length === 0 ? (
                  <p className="text-sm text-zinc-400 py-8 text-center">
                    No wallet transactions recorded yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10 text-xs text-zinc-400">
                          <th className="py-2.5 pr-4 font-medium">Player</th>
                          <th className="py-2.5 px-3 font-medium">Type</th>
                          <th className="py-2.5 px-3 font-medium">UTR / UPI</th>
                          <th className="py-2.5 px-3 text-right font-medium">Amount</th>
                          <th className="py-2.5 px-3 font-medium">Status</th>
                          <th className="py-2.5 pl-3 text-right font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-sm">
                        {allWalletTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-white/[0.02]">
                            <td className="py-3 pr-4">
                              <p className="text-xs font-medium text-white">
                                {tx.userEmail}
                              </p>
                              <p className="text-[11px] text-zinc-500 truncate max-w-[180px]">
                                {tx.note}
                              </p>
                            </td>
                            <td className="py-3 px-3 text-xs capitalize text-zinc-300">
                              {tx.type.replace('_', ' ')}
                            </td>
                            <td className="py-3 px-3 font-mono text-xs text-zinc-300">
                              {tx.utrOrUpi}
                            </td>
                            <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-white">
                              ₹{tx.amount.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`text-xs font-semibold capitalize ${
                                  tx.status === 'approved'
                                    ? 'text-emerald-400'
                                    : tx.status === 'rejected'
                                    ? 'text-red-400'
                                    : 'text-amber-400'
                                }`}
                              >
                                {tx.status}
                              </span>
                            </td>
                            <td className="py-3 pl-3 text-right">
                              {tx.status === 'pending' ? (
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={processingWallet}
                                    onClick={() =>
                                      void handleWalletTxDecision(tx, 'approved')
                                    }
                                    className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium rounded-md cursor-pointer"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    disabled={processingWallet}
                                    onClick={() =>
                                      void handleWalletTxDecision(tx, 'rejected')
                                    }
                                    className="px-2.5 py-1 bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs font-medium rounded-md cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-zinc-500">Settled</span>
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

            {/* All Player Wallets Table */}
            <div className="bg-[#121318] border border-white/10 rounded-xl p-6 space-y-4">
              <h3 className="font-display text-xl font-bold text-white">
                Player Wallet Balances
              </h3>
              {allWallets.length === 0 ? (
                <p className="text-xs text-zinc-400">No player wallets created yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-xs text-zinc-400">
                        <th className="py-2.5 pr-4 font-medium">Player Email</th>
                        <th className="py-2.5 px-3 text-right font-medium">Balance</th>
                        <th className="py-2.5 px-3 text-right font-medium">Deposited</th>
                        <th className="py-2.5 px-3 text-right font-medium">Won</th>
                        <th className="py-2.5 pl-3 text-right font-medium">Withdrawn</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-sm">
                      {allWallets.map((w) => (
                        <tr key={w.userId}>
                          <td className="py-2.5 pr-4 text-xs text-white">{w.userEmail}</td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-orange-400 font-semibold">
                            ₹{w.balance.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-zinc-300">
                            ₹{w.totalDeposited.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-400">
                            ₹{w.totalWon.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 pl-3 text-right font-mono tabular-nums text-zinc-400">
                            ₹{w.totalWithdrawn.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: PAYMENT & PLATFORM SETTINGS */}
        {activeTab === 'settings' && (
          <form
            onSubmit={(e) => void handleSaveSettings(e)}
            className="max-w-2xl bg-[#121318] border border-white/10 rounded-xl p-6 space-y-4"
          >
            <h2 className="font-display text-2xl font-bold text-white">
              UPI Payment &amp; Support Settings
            </h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">
                  Official UPI ID *
                </label>
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full bg-[#09090B] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">
                  Merchant / Account Name *
                </label>
                <input
                  type="text"
                  required
                  value={upiName}
                  onChange={(e) => setUpiName(e.target.value)}
                  className="w-full bg-[#09090B] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">
                  Support Phone Number *
                </label>
                <input
                  type="text"
                  required
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  className="w-full bg-[#09090B] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">
                  Community Invite URL
                </label>
                <input
                  type="text"
                  value={communityUrl}
                  onChange={(e) => setCommunityUrl(e.target.value)}
                  className="w-full bg-[#09090B] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5">
                Room Access Notice / Announcement
              </label>
              <textarea
                rows={2}
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value)}
                className="w-full bg-[#09090B] border border-white/15 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-zinc-950 font-semibold text-sm rounded-lg transition-colors cursor-pointer"
            >
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
