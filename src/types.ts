export type TournamentMode = 'Solo' | 'Squad';
export type TournamentStatus = 'upcoming' | 'live' | 'completed';
export type MapName =
  | 'Bermuda'
  | 'Purgatory'
  | 'Kalahari'
  | 'Bermuda Remastered'
  | 'Alpine'
  | 'NeXTerra';

export type PaymentMethod =
  | 'UPI QR'
  | 'GPay'
  | 'PhonePe'
  | 'Paytm'
  | 'Free Entry'
  | 'Wallet';
export type PaymentStatus = 'pending' | 'verified' | 'rejected';
export type WalletTxType = 'deposit' | 'withdrawal' | 'entry_fee' | 'prize_credit';
export type WalletTxStatus = 'pending' | 'approved' | 'rejected';

export interface Wallet {
  id: string;
  userId: string;
  userEmail: string;
  balance: number;
  totalDeposited: number;
  totalWon: number;
  totalWithdrawn: number;
  lastTxId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  userEmail: string;
  type: WalletTxType;
  amount: number;
  status: WalletTxStatus;
  utrOrUpi: string;
  tournamentId: string;
  note: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PlatformSettings {
  upiId: string;
  upiName: string;
  whatsappNumber: string;
  whatsappGroupUrl: string;
  announcement: string;
  updatedBy: string;
  updatedAt?: unknown;
}

export interface Tournament {
  id: string;
  title: string;
  mode: TournamentMode;
  mapName: MapName;
  entryFee: number;
  prizePool: number;
  perKillPrize: number;
  maxSlots: number;
  startTime: string;
  status: TournamentStatus;
  roomReleased: boolean;
  rulesSummary: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface RoomAccess {
  tournamentId: string;
  roomId: string;
  roomPassword: string;
  instructions: string;
  released: boolean;
  updatedBy: string;
  updatedAt?: unknown;
}

export interface PublicSlot {
  id: string;
  tournamentId: string;
  userId: string;
  displayName: string;
  mode: TournamentMode;
  paymentStatus: PaymentStatus;
  slotNumber: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Registration {
  id: string;
  tournamentId: string;
  tournamentTitle: string;
  userId: string;
  userEmail: string;
  mode: TournamentMode;
  teamName: string;
  leaderIgn: string;
  leaderUid: string;
  squadMembers: string[];
  whatsappPhone: string;
  paymentMethod: PaymentMethod;
  paymentUtr: string;
  amountPaid: number;
  paymentStatus: PaymentStatus;
  adminNote: string;
  slotNumber: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StandingRow {
  rank: number;
  name: string;
  kills: number;
  placementPoints: number;
  killPoints: number;
  totalPoints: number;
  prizeWon: number;
}

export interface TournamentResult {
  id: string;
  tournamentId: string;
  tournamentTitle: string;
  mode: TournamentMode;
  mapName: string;
  matchDate: string;
  mvpPlayer: string;
  prizeDistributed: number;
  standings: StandingRow[];
  publishedBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

// Validation limits synchronized verbatim with firebase-blueprint.json
export const VALIDATION_RULES = {
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  UPI_PATTERN: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/,
  PHONE_PATTERN: /^[0-9+\- ]+$/,
  UID_PATTERN: /^[0-9]+$/,
  UTR_PATTERN: /^[a-zA-Z0-9_-]+$/,
  MAX_TITLE_LEN: 100,
  MAX_IGN_LEN: 40,
  MAX_TEAM_LEN: 50,
  MAX_UID_LEN: 20,
  MIN_UID_LEN: 5,
  MAX_PHONE_LEN: 20,
  MIN_PHONE_LEN: 8,
  MAX_UTR_LEN: 60,
  MIN_UTR_LEN: 2,
  MAX_ADMIN_NOTE_LEN: 200,
  MAX_RULES_LEN: 800,
  MAX_INSTRUCTIONS_LEN: 400,
} as const;
