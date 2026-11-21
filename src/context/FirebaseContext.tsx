import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import {
  PlatformSettings,
  PublicSlot,
  Registration,
  Tournament,
  TournamentResult,
  Wallet,
  WalletTransaction,
} from '../types';

const DEFAULT_SETTINGS: PlatformSettings = {
  upiId: 'gajjar45@fam',
  upiName: 'TXP Esports Official',
  whatsappNumber: '+91 98765 43210',
  whatsappGroupUrl: 'https://chat.whatsapp.com/',
  announcement: 'Room ID & Password unlock automatically 15 minutes before match start for verified slots.',
  updatedBy: 'system',
};

interface FirebaseContextValue {
  user: User | null;
  authReady: boolean;
  isAdmin: boolean;
  signingIn: boolean;
  authError: string | null;
  settings: PlatformSettings;
  tournaments: Tournament[];
  tournamentsLoading: boolean;
  results: TournamentResult[];
  resultsLoading: boolean;
  myRegistrations: Registration[];
  allRegistrations: Registration[];
  publicSlotsByTournament: Record<string, PublicSlot[]>;
  wallet: Wallet | null;
  walletLoading: boolean;
  myWalletTransactions: WalletTransaction[];
  allWallets: Wallet[];
  allWalletTransactions: WalletTransaction[];
  signInWithGoogle: () => Promise<User | null>;
  signOut: () => Promise<void>;
  seedStarterData: () => Promise<void>;
  seeding: boolean;
}

const FirebaseContext = createContext<FirebaseContextValue | undefined>(undefined);

const BOOTSTRAPPED_ADMIN_EMAIL = 'alokji570@gmail.com';

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdminDoc, setIsAdminDoc] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [, setFatalError] = useState<unknown>(null);

  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(true);
  const [results, setResults] = useState<TournamentResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [myRegistrations, setMyRegistrations] = useState<Registration[]>([]);
  const [allRegistrations, setAllRegistrations] = useState<Registration[]>([]);
  const [publicSlotsByTournament, setPublicSlotsByTournament] = useState<
    Record<string, PublicSlot[]>
  >({});
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [myWalletTransactions, setMyWalletTransactions] = useState<
    WalletTransaction[]
  >([]);
  const [allWallets, setAllWallets] = useState<Wallet[]>([]);
  const [allWalletTransactions, setAllWalletTransactions] = useState<
    WalletTransaction[]
  >([]);
  const [seeding, setSeeding] = useState(false);

  const isAdmin = useMemo(() => {
    if (!user || !user.emailVerified) return false;
    return user.email === BOOTSTRAPPED_ADMIN_EMAIL || isAdminDoc;
  }, [user, isAdminDoc]);

  const raiseFirestoreError = (
    error: unknown,
    operationType: OperationType,
    path: string | null
  ) => {
    setFatalError(() => {
      handleFirestoreError(error, operationType, path);
    });
  };

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthError(null);
      if (currentUser && currentUser.emailVerified) {
        try {
          const adminSnap = await getDoc(doc(db, 'admins', currentUser.uid));
          setIsAdminDoc(adminSnap.exists());
        } catch {
          setIsAdminDoc(false);
        }
      } else {
        setIsAdminDoc(false);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Public settings listener
  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'public');
    const unsub = onSnapshot(
      settingsRef,
      (snap) => {
        if (snap.exists()) {
          setSettings(snap.data() as PlatformSettings);
        } else {
          setSettings(DEFAULT_SETTINGS);
        }
      },
      (error) => raiseFirestoreError(error, OperationType.GET, 'settings/public')
    );
    return () => unsub();
  }, []);

  // Public tournaments listener
  useEffect(() => {
    const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: Tournament[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Tournament, 'id'>),
        }));
        setTournaments(items);
        setTournamentsLoading(false);
      },
      (error) => raiseFirestoreError(error, OperationType.LIST, 'tournaments')
    );
    return () => unsub();
  }, []);

  // Public slots listeners per tournament
  useEffect(() => {
    if (tournaments.length === 0) {
      setPublicSlotsByTournament({});
      return;
    }

    const unsubs = tournaments.map((t) => {
      const slotsPath = `tournaments/${t.id}/publicSlots`;
      const q = query(collection(db, slotsPath), orderBy('createdAt', 'asc'));
      return onSnapshot(
        q,
        (snap) => {
          const slots: PublicSlot[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<PublicSlot, 'id'>),
          }));
          setPublicSlotsByTournament((prev) => ({
            ...prev,
            [t.id]: slots,
          }));
        },
        (error) => raiseFirestoreError(error, OperationType.LIST, slotsPath)
      );
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [tournaments]);

  // Public results listener
  useEffect(() => {
    const q = query(collection(db, 'results'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: TournamentResult[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<TournamentResult, 'id'>),
        }));
        setResults(items);
        setResultsLoading(false);
      },
      (error) => raiseFirestoreError(error, OperationType.LIST, 'results')
    );
    return () => unsub();
  }, []);

  // Authenticated player registrations listener
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) {
      setMyRegistrations([]);
      return;
    }

    const q = query(
      collection(db, 'registrations'),
      where('userId', '==', user.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: Registration[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Registration, 'id'>),
        }));
        setMyRegistrations(items);
      },
      (error) => raiseFirestoreError(error, OperationType.LIST, 'registrations')
    );
    return () => unsub();
  }, [authReady, user]);

  // Admin full registrations listener
  useEffect(() => {
    if (!authReady || !isAdmin) {
      setAllRegistrations([]);
      return;
    }

    const q = query(collection(db, 'registrations'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items: Registration[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Registration, 'id'>),
        }));
        setAllRegistrations(items);
      },
      (error) => raiseFirestoreError(error, OperationType.LIST, 'registrations')
    );
    return () => unsub();
  }, [authReady, isAdmin]);

  // Authenticated player wallet & transaction history listeners
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) {
      setWallet(null);
      setMyWalletTransactions([]);
      setWalletLoading(false);
      return;
    }

    setWalletLoading(true);
    const walletPath = `wallets/${user.uid}`;
    const walletRef = doc(db, 'wallets', user.uid);

    // Ensure wallet exists
    getDoc(walletRef)
      .then(async (snap) => {
        if (!snap.exists()) {
          const now = serverTimestamp();
          await setDoc(walletRef, {
            userId: user.uid,
            userEmail: (user.email || 'player@txpesports.com').slice(0, 120),
            balance: 0,
            totalDeposited: 0,
            totalWon: 0,
            totalWithdrawn: 0,
            lastTxId: '',
            createdAt: now,
            updatedAt: now,
          });
        }
      })
      .catch((error) => handleFirestoreError(error, OperationType.GET, walletPath));

    const unsubWallet = onSnapshot(
      walletRef,
      (snap) => {
        if (snap.exists()) {
          setWallet({ id: snap.id, ...(snap.data() as Omit<Wallet, 'id'>) });
        } else {
          setWallet(null);
        }
        setWalletLoading(false);
      },
      (error) => raiseFirestoreError(error, OperationType.GET, walletPath)
    );

    const txQuery = query(
      collection(db, 'walletTransactions'),
      where('userId', '==', user.uid)
    );
    const unsubTx = onSnapshot(
      txQuery,
      (snap) => {
        const items: WalletTransaction[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<WalletTransaction, 'id'>),
        }));
        items.sort((a, b) => {
          const aSec = (a.createdAt as { seconds?: number } | undefined)?.seconds || 0;
          const bSec = (b.createdAt as { seconds?: number } | undefined)?.seconds || 0;
          return bSec - aSec;
        });
        setMyWalletTransactions(items);
      },
      (error) => raiseFirestoreError(error, OperationType.LIST, 'walletTransactions')
    );

    return () => {
      unsubWallet();
      unsubTx();
    };
  }, [authReady, user]);

  // Admin full wallets & walletTransactions listeners
  useEffect(() => {
    if (!authReady || !isAdmin) {
      setAllWallets([]);
      setAllWalletTransactions([]);
      return;
    }

    const unsubWallets = onSnapshot(
      collection(db, 'wallets'),
      (snap) => {
        const items: Wallet[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Wallet, 'id'>),
        }));
        setAllWallets(items);
      },
      (error) => raiseFirestoreError(error, OperationType.LIST, 'wallets')
    );

    const txQuery = query(
      collection(db, 'walletTransactions'),
      orderBy('createdAt', 'desc')
    );
    const unsubTxs = onSnapshot(
      txQuery,
      (snap) => {
        const items: WalletTransaction[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<WalletTransaction, 'id'>),
        }));
        setAllWalletTransactions(items);
      },
      (error) => raiseFirestoreError(error, OperationType.LIST, 'walletTransactions')
    );

    return () => {
      unsubWallets();
      unsubTxs();
    };
  }, [authReady, isAdmin]);

  const seedStarterData = async () => {
    if (!user || !isAdmin || seeding) return;
    setSeeding(true);
    try {
      const batch = writeBatch(db);
      const now = serverTimestamp();

      batch.set(doc(db, 'settings', 'public'), {
        upiId: 'gajjar45@fam',
        upiName: 'TXP Esports Official',
        whatsappNumber: '+91 98765 43210',
        whatsappGroupUrl: 'https://chat.whatsapp.com/',
        announcement:
          'Room ID & Password unlock automatically 15 minutes before match start for verified slots.',
        updatedBy: user.uid,
        updatedAt: now,
      });

      const starterTournaments = [
        {
          id: 'txp-bermuda-squad-s4',
          title: 'TXP Bermuda Squad Championship',
          mode: 'Squad',
          mapName: 'Bermuda',
          entryFee: 100,
          prizePool: 5000,
          perKillPrize: 25,
          maxSlots: 12,
          startTime: 'Tonight · 8:30 PM IST',
          status: 'upcoming',
          roomReleased: false,
          rulesSummary:
            'Full Map Squad (48 Players / 12 Squads). Mobile devices only; emulators and triggers strictly banned. Screen recording required for top 3 finishers.',
        },
        {
          id: 'txp-kalahari-solo-clash',
          title: 'TXP Solo Clash: Kalahari',
          mode: 'Solo',
          mapName: 'Kalahari',
          entryFee: 50,
          prizePool: 2000,
          perKillPrize: 20,
          maxSlots: 48,
          startTime: 'Tomorrow · 7:00 PM IST',
          status: 'upcoming',
          roomReleased: false,
          rulesSummary:
            '48-player Solo lobby. No teaming permitted; suspicious teaming results in instant disqualification and prize forfeiture.',
        },
        {
          id: 'txp-free-community-scrim',
          title: 'TXP Open Free-Entry Scrims',
          mode: 'Squad',
          mapName: 'Purgatory',
          entryFee: 0,
          prizePool: 1000,
          perKillPrize: 10,
          maxSlots: 12,
          startTime: 'Today · 10:00 PM IST',
          status: 'live',
          roomReleased: true,
          rulesSummary:
            'Open qualifier scrimmage on Purgatory. Free entry for verified TXP Esports accounts. Top 2 squads earn direct seed to Weekly Finals.',
        },
        {
          id: 'txp-alpine-elite-cup',
          title: 'TXP Alpine Elite Cup #12',
          mode: 'Squad',
          mapName: 'Alpine',
          entryFee: 120,
          prizePool: 6000,
          perKillPrize: 30,
          maxSlots: 12,
          startTime: 'Completed · Nov 18',
          status: 'completed',
          roomReleased: true,
          rulesSummary:
            'Completed 3-match points series on Alpine. Official standings and prize payouts settled.',
        },
      ];

      for (const item of starterTournaments) {
        const { id, ...fields } = item;
        batch.set(doc(db, 'tournaments', id), {
          ...fields,
          createdBy: user.uid,
          createdAt: now,
          updatedAt: now,
        });

        batch.set(doc(db, 'tournaments', id, 'roomAccess', 'credentials'), {
          tournamentId: id,
          roomId: id === 'txp-free-community-scrim' ? '88492017' : 'TBD-ADMIN',
          roomPassword: id === 'txp-free-community-scrim' ? 'TXP909' : 'PENDING',
          instructions:
            'Join the custom room 10 minutes early and sit in your assigned slot number. Do not share Room ID or Password outside your squad.',
          released: item.roomReleased,
          updatedBy: user.uid,
          updatedAt: now,
        });
      }

      batch.set(doc(db, 'results', 'res-txp-alpine-elite-cup'), {
        tournamentId: 'txp-alpine-elite-cup',
        tournamentTitle: 'TXP Alpine Elite Cup #12',
        mode: 'Squad',
        mapName: 'Alpine',
        matchDate: 'Nov 18, 2026',
        mvpPlayer: 'TXP·KiraFF (14 Kills)',
        prizeDistributed: 6000,
        standings: [
          {
            rank: 1,
            name: 'Vanguard Four',
            kills: 24,
            placementPoints: 36,
            killPoints: 24,
            totalPoints: 60,
            prizeWon: 3000,
          },
          {
            rank: 2,
            name: 'Apex Predators',
            kills: 19,
            placementPoints: 27,
            killPoints: 19,
            totalPoints: 46,
            prizeWon: 1800,
          },
          {
            rank: 3,
            name: 'Ignite Syndicate',
            kills: 15,
            placementPoints: 22,
            killPoints: 15,
            totalPoints: 37,
            prizeWon: 1200,
          },
          {
            rank: 4,
            name: 'Obsidian X',
            kills: 12,
            placementPoints: 18,
            killPoints: 12,
            totalPoints: 30,
            prizeWon: 0,
          },
        ],
        publishedBy: user.uid,
        createdAt: now,
        updatedAt: now,
      });

      batch.set(doc(db, 'results', 'res-txp-solo-invitational'), {
        tournamentId: 'txp-alpine-elite-cup',
        tournamentTitle: 'TXP Solo Showdown #09',
        mode: 'Solo',
        mapName: 'Bermuda',
        matchDate: 'Nov 15, 2026',
        mvpPlayer: 'Raze_OneTap (11 Kills)',
        prizeDistributed: 2000,
        standings: [
          {
            rank: 1,
            name: 'Raze_OneTap',
            kills: 11,
            placementPoints: 12,
            killPoints: 11,
            totalPoints: 23,
            prizeWon: 1100,
          },
          {
            rank: 2,
            name: 'ShadowVex',
            kills: 8,
            placementPoints: 9,
            killPoints: 8,
            totalPoints: 17,
            prizeWon: 600,
          },
          {
            rank: 3,
            name: 'KaelenFF',
            kills: 6,
            placementPoints: 8,
            killPoints: 6,
            totalPoints: 14,
            prizeWon: 300,
          },
        ],
        publishedBy: user.uid,
        createdAt: now,
        updatedAt: now,
      });

      await batch.commit();
    } catch (error) {
      raiseFirestoreError(error, OperationType.WRITE, 'seedStarterData');
    } finally {
      setSeeding(false);
    }
  };

  // Auto-seed once when Admin signs in and settings/public does not exist yet
  useEffect(() => {
    if (!authReady || !isAdmin) return;
    let active = true;
    (async () => {
      try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'public'));
        if (!active) return;
        if (!settingsSnap.exists()) {
          await seedStarterData();
        } else if (settingsSnap.data()?.upiId === 'txpesports@okaxis' && user) {
          await updateDoc(doc(db, 'settings', 'public'), {
            upiId: 'gajjar45@fam',
            updatedBy: user.uid,
            updatedAt: serverTimestamp(),
          });
        }
      } catch {
        // Ignore auto-seed check failures
      }
    })();
    return () => {
      active = false;
    };
  }, [authReady, isAdmin]);

  const signInWithGoogle = async (): Promise<User | null> => {
    setSigningIn(true);
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      return cred.user;
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Unable to complete Google sign-in.';
      setAuthError(msg);
      return null;
    } finally {
      setSigningIn(false);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const value: FirebaseContextValue = {
    user,
    authReady,
    isAdmin,
    signingIn,
    authError,
    settings,
    tournaments,
    tournamentsLoading,
    results,
    resultsLoading,
    myRegistrations,
    allRegistrations,
    publicSlotsByTournament,
    wallet,
    walletLoading,
    myWalletTransactions,
    allWallets,
    allWalletTransactions,
    signInWithGoogle,
    signOut,
    seedStarterData,
    seeding,
  };

  return <FirebaseContext.Provider value={value}>{children}</FirebaseContext.Provider>;
}

export function useFirebase() {
  const ctx = useContext(FirebaseContext);
  if (!ctx) {
    throw new Error('useFirebase must be used inside FirebaseProvider');
  }
  return ctx;
}
