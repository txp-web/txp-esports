# TXP Esports Security Specification (Phase 0 TDD)

## 1. Data Invariants

1. **PII Isolation**: Player `whatsappPhone`, `userEmail`, `leaderUid`, and `paymentUtr` live strictly in `/registrations/{registrationId}` and are readable ONLY by the owning player (`resource.data.userId == request.auth.uid`) or an Admin (`isAdmin()`). Public slot counts use `/tournaments/{tournamentId}/publicSlots/{registrationId}`, which contains zero PII.
2. **Room ID & Password Protection**: `/tournaments/{tournamentId}/roomAccess/credentials` can ONLY be read (`get`) by an Admin or by an email-verified signed-in user whose deterministic registration `/registrations/{tournamentId}_{uid}` has `paymentStatus == 'verified'` AND `resource.data.released == true`.
3. **No Self-Verification or Slot Hijacking**: On registration creation, `paymentStatus` MUST equal `'pending'`, `slotNumber` MUST equal `0`, and `adminNote` MUST equal `''`. Players cannot update `paymentStatus`, `slotNumber`, or `adminNote`.
4. **Atomic Registration-to-PublicSlot Sync**: Creating `/registrations/{registrationId}` requires `existsAfter(/tournaments/{tournamentId}/publicSlots/{registrationId})`, and creating `/publicSlots/{registrationId}` requires `existsAfter(/registrations/{registrationId})`.
5. **Admin Authority & Spoof Protection**: `isAdmin()` requires `request.auth != null && request.auth.token.email_verified == true` and either `request.auth.token.email == 'alokji570@gmail.com'` or an existing `/admins/{request.auth.uid}` document.
6. **Strict Schema & Size Bounds**: Every write validates required/allowed keys (`hasAll` + `hasOnly`), string `.size()` limits, regex patterns, and server timestamps (`request.time`).

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)

1. **Self-Verify Payment on Create**: Player creates `/registrations/t1_uid1` with `paymentStatus: "verified"`.
2. **Self-Assign Slot Number**: Player creates `/registrations/t1_uid1` with `slotNumber: 1`.
3. **Ghost Field Injection (Shadow Update)**: Player creates `/registrations/t1_uid1` with extra key `isAdmin: true`.
4. **Cross-User Identity Spoofing**: User `uid2` creates `/registrations/t1_uid1` with `userId: "uid1"`.
5. **Unverified Player Reading Room Password**: Player with `paymentStatus: "pending"` calls `get(/tournaments/t1/roomAccess/credentials)`.
6. **Unregistered Player Reading Room Password**: Signed-in user with no registration calls `get(/tournaments/t1/roomAccess/credentials)`.
7. **Reading Room Password Before Release**: Verified player calls `get(/tournaments/t1/roomAccess/credentials)` when `released: false`.
8. **Blanket Registration Scraping**: Non-admin user attempts `list(/registrations)` without `where("userId", "==", uid)`.
9. **Client Timestamp Forgery**: Player creates registration with `createdAt` set to past date instead of `request.time`.
10. **Orphaned Registration**: Player creates registration for non-existent `tournamentId: "fake_tourney"`.
11. **Non-Admin Creating Tournament**: Regular player attempts `create(/tournaments/t2)`.
12. **Email Spoofing Without Verification**: User with `email: "alokji570@gmail.com"` and `email_verified: false` attempts admin write on `/settings/public`.
