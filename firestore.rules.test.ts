/**
 * Phase 0 Payload-First Security Test Suite for TXP Esports Firestore Rules.
 * Run against Firebase Emulator Suite (@firebase/rules-unit-testing) when testing locally.
 */
export const DIRTY_DOZEN_CASES = [
  {
    id: 1,
    name: 'Self-Verify Payment on Create',
    collection: 'registrations/t1_uid1',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { paymentStatus: 'verified', slotNumber: 0 }
  },
  {
    id: 2,
    name: 'Self-Assign Slot Number',
    collection: 'registrations/t1_uid1',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { paymentStatus: 'pending', slotNumber: 1 }
  },
  {
    id: 3,
    name: 'Shadow Ghost Field Injection',
    collection: 'registrations/t1_uid1',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { isAdmin: true }
  },
  {
    id: 4,
    name: 'Cross-User Identity Spoofing',
    collection: 'registrations/t1_uid1',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { userId: 'victim_uid' }
  },
  {
    id: 5,
    name: 'Pending Player Reads Room Password',
    collection: 'tournaments/t1/roomAccess/credentials',
    operation: 'get',
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 6,
    name: 'Unregistered Player Reads Room Password',
    collection: 'tournaments/t1/roomAccess/credentials',
    operation: 'get',
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 7,
    name: 'Verified Player Reads Unreleased Room Password',
    collection: 'tournaments/t1/roomAccess/credentials',
    operation: 'get',
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 8,
    name: 'Non-Admin Scrapes Registrations List',
    collection: 'registrations',
    operation: 'list',
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 9,
    name: 'Client Timestamp Forgery',
    collection: 'registrations/t1_uid1',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { createdAt: '2020-01-01T00:00:00Z' }
  },
  {
    id: 10,
    name: 'Orphaned Tournament Registration',
    collection: 'registrations/nonexistent_uid1',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { tournamentId: 'nonexistent' }
  },
  {
    id: 11,
    name: 'Non-Admin Creates Tournament',
    collection: 'tournaments/t99',
    operation: 'create',
    expected: 'PERMISSION_DENIED'
  },
  {
    id: 12,
    name: 'Unverified Email Admin Spoof',
    collection: 'settings/public',
    operation: 'update',
    expected: 'PERMISSION_DENIED'
  }
] as const;
