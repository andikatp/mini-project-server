# EventMgmt — Backend PRD

_Server-side contract for `mini-project-server`. Split from the full PRD
("EventMgmt — PRD (Improved)" in Google Docs), which remains the complete
reference ("kitab"). This file contains only what the backend needs._

## 1. Product & team

EventMgmt is a two-sided event platform: attendees discover events, buy
tickets, upload payment proof, use referral rewards, and review attended
events. Organizers create/promote events, review transactions, and monitor
performance from a shared, role-based dashboard.

| Owner              | Backend scope                                                               |
| ------------------ | --------------------------------------------------------------------------- |
| Kelvin (Feature 1) | Event/ticket/voucher CRUD, checkout & transactions, payment proofs, reviews |
| Andika (Feature 2) | Auth & roles, referral/points/coupons, organizer dashboard & stats, emails  |
| Shared             | DB schema, API contract, seed data, env contract                            |

## 2. Server stack

| Layer        | Technology                                                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Server       | Node.js + Express + TypeScript                                                                                                |
| ORM          | Prisma (typed access, migrations, interactive transactions)                                                                   |
| Database     | Neon PostgreSQL                                                                                                               |
| Hosting      | Render (API + migrations on release; cron via external scheduled job)                                                         |
| Auth         | Database-backed session (stored in Postgres `sessions` table) + HttpOnly cookie + argon2                                      |
| Validation   | Zod (params, query, body — every endpoint)                                                                                    |
| File storage | Cloudinary — store URLs + metadata, never image bytes in Postgres                                                             |
| Email        | Resend (HTTP API, API key based) — decided 2026-10-22                                                                         |
| Scheduler    | Idempotent expiry service invoked by an external cron (Render Cron Job or equivalent). Never rely on in-process timers alone. |

Environment (server): DATABASE_URL, DIRECT_URL, SESSION_SECRET,
CLIENT_ORIGIN, RESEND_API_KEY, EMAIL_FROM, Cloudinary keys.
`.env` at repo root, never in `src/`; commit only `.env.example`.

## 3. Roles & authorization (server is the authority)

Roles: `CUSTOMER`, `EVENT_ORGANIZER`. No platform super-admin.

- Client-side route guards are UX only — every protected action MUST be
  authorized server-side (role + ownership middleware).
- Organizer may touch only their own events and those events' transactions.
- Customer may touch only their own profile, rewards, transactions, proofs.
- Public event responses must never leak password hashes, reset codes, or
  private emails.

## 4. Functional requirements (server view)

### 4.1 Auth & profile (Andika)

- `AUTH-01` Register as CUSTOMER or EVENT_ORGANIZER. Email unique; role
  cannot be escalated via crafted requests.
- `AUTH-02` Sign in/out + load session. Wrong role/owner → 401/403.
- `AUTH-03` Change password; forgot/reset via emailed 6-digit OTP code.
  Reset codes single-use, hashed at rest, expire within 10 minutes, and are
  invalidated after 5 failed attempts. Email verification uses the same
  OTP pattern (codes sent via Resend).
- `AUTH-04` Edit name/avatar. Validate; restrict file type + size.
- `AUTH-05` Each user gets one immutable unique referral code at signup;
  validate submitted codes during registration.

### 4.2 Events, tickets, vouchers (Kelvin)

- `EVT-01` Organizer CRUD on owned events (name, dates, location, category,
  description, ticket types). Publish/cancel flows.
- `EVT-02` Ticket types: name, IDR price (integer, ≥ 0; 0 = free), quota,
  optional sales window.
- `EVT-04` Event vouchers: code, FIXED/PERCENT discount, max discount,
  min subtotal, quota, validFrom/validUntil, active flag. Valid only for the
  linked event.
- `EVT-05` Capacity cannot drop below reserved+sold; conflicts → 409.

### 4.3 Checkout & transactions (Kelvin)

- `TRX-01` Signed-in customer creates transaction for available quantities.
  Server recalculates all prices and eligibility — never trust client totals.
- `TRX-02` Checkout may combine voucher + coupon + points in one
  transaction (decided 2026-10-15: stacking allowed). Pricing order:
  1. subtotal from server-side prices × quantities, 2. voucher discount,
  2. coupon discount, 4. points (1 point = IDR 1), capped so total never
     goes negative. Persist the full breakdown.
- `TRX-03` Paid checkout → WAITING_FOR_PAYMENT, response includes
  paymentExpiresAt = createdAt + 2 hours.
- `TRX-04` Proof upload before deadline → WAITING_FOR_ADMIN_CONFIRMATION,
  set confirmationDueAt = proofUploadedAt + 3 days.
- `TRX-05` Organizer accept → DONE; reject → REJECTED + rollback + email.
- `TRX-06` Scheduler: no proof in 2h → EXPIRED; no organizer decision in
  3d → CANCELED. Idempotent (see rollbackProcessedAt).
- `TRX-07` Rollback on EXPIRED/CANCELED/REJECTED restores seats and rewards
  exactly once (matrix in §5).
- Free checkout: immediately DONE after atomic availability check
  (no proof states).
- All multi-table writes use Prisma interactive transactions.
- Checkout must atomically guard capacity (no oversell under concurrency).

### 4.4 Referral & rewards (Andika)

- `RWD-01` Referral code attachable once at registration. Reject self-referral,
  reuse, unknown codes.
- `RWD-02` Referrer gets 10,000 points, expiring 3 months after credit.
- `RWD-03` Referred user gets a system coupon (valid all events),
  expiring 3 months after issue.
- `RWD-04` Points reduce payable amount; record which credit buckets were
  consumed (spend oldest first) for expiry + rollback audit.
- `RWD-05` Vouchers (organizer, per-event) and coupons (system, all events)
  stay separate concepts.
- Balance = sum of unexpired, unconsumed credits − allocations. Never a
  freely editable field.

### 4.5 Reviews (Kelvin)

- `REV-01` Only after eligible completed transaction: server checks ownership,
  DONE status, event end time.
- `REV-02` One review per customer per event. Rating 1–5, optional text.
- `REV-03` Ratings derived (avg + count); never a manually editable average.
- **Decided 2026-10-15:** reviews require organizer approval before display.
  Status: PENDING → APPROVED / REJECTED.

### 4.6 Dashboard, notifications, attendees (Andika)

- `DASH-01/02` Organizer stats for owned events: transaction count, revenue,
  tickets sold, status distribution; group by day/month/year.
- `DASH-03` Inspect proofs; accept/reject with server ownership check.
- `DASH-04` Attendee list per event: name, ticket qty, total paid
  (DONE only by default).
- `MAIL-01` Email customer on proof accepted/rejected. DB change commits
  independently; email delivery is logged (email_logs) and retryable.

## 5. Transaction status lifecycle (server is the only authority)

| Status                           | Entered by                                                                        |
| -------------------------------- | --------------------------------------------------------------------------------- |
| `WAITING_FOR_PAYMENT`            | Paid checkout succeeds (reserve seats + rewards, set 2h deadline)                 |
| `WAITING_FOR_ADMIN_CONFIRMATION` | Valid proof uploaded in time (set 3-day decision deadline)                        |
| `DONE`                           | Organizer accepts proof, or free checkout                                         |
| `REJECTED`                       | Organizer rejects (rollback + reason + email)                                     |
| `EXPIRED`                        | Scheduler: no proof within 2 hours (rollback)                                     |
| `CANCELED`                       | Scheduler: no decision within 3 days (rollback), or customer cancels before proof |

Terminal states (DONE/REJECTED/EXPIRED/CANCELED) accept no further
transitions — return idempotent result or 409.

Rollback matrix (exactly once, guarded by rollbackProcessedAt):

| Resource      | On rollback                                          |
| ------------- | ---------------------------------------------------- |
| Ticket seats  | Decrease reserved by item quantity                   |
| Points        | Reverse debit into original unexpired credit buckets |
| System coupon | Return to available (within policy)                  |
| Event voucher | Release redemption/quota                             |

## 6. Database schema (draft — freeze names/enums before coding)

Conventions: UUID PKs; money as integer IDR; UTC timestamps; `createdAt`/
`updatedAt`; explicit FKs; indexes on search/ownership/status/deadline
fields; soft-cancel over destructive delete for transaction-referenced rows.

Tables: `users` (email UQ, passwordHash, role, referralCode UQ immutable,
referredByUserId FK), `sessions` (tokenHash UQ, userId FK, expiresAt),
`password_reset_codes` (codeHash, attempts, userId FK, expiresAt, usedAt),
`email_verification_codes` (codeHash, attempts, userId FK, expiresAt, usedAt),
`categories`, `events`
(organizerId, categoryId, status), `ticket_types` (priceIdr, quota,
reservedQty, soldQty), `event_vouchers`, `coupons` (ownerUserId, status),
`point_credits` (amount, remainingAmount, expiresAt), `transactions`
(code UQ, status, subtotalIdr, voucherDiscountIdr, couponDiscountIdr,
pointsUsed, totalIdr, paymentExpiresAt, proofUploadedAt, confirmationDueAt,
rollbackProcessedAt), `transaction_items` (price/name snapshots),
`payment_proofs` (fileUrl, reviewedByUserId, rejectionReason),
`voucher_redemptions`, `coupon_redemptions`, `point_allocations`
(statuses RESERVED/REDEEMED/REVERSED), `reviews` (unique customerId+eventId,
status PENDING/APPROVED/REJECTED), `email_logs`.

Enums: `UserRole` (CUSTOMER, EVENT_ORGANIZER), `EventStatus`
(DRAFT, PUBLISHED, CANCELED, COMPLETED), `TransactionStatus` (6 values),
`DiscountType` (FIXED, PERCENT), `ReservationStatus`
(RESERVED, REDEEMED, REVERSED), `CouponStatus`
(AVAILABLE, RESERVED, REDEEMED, EXPIRED), `ReviewStatus`
(PENDING, APPROVED, REJECTED).

Key indexes: `events(status, startAt)`, `events(categoryId, city)`,
`events(organizerId)`, `transactions(customerId, status)`,
`transactions(eventId, status)`, `transactions(paymentExpiresAt)`,
`transactions(confirmationDueAt)`.

## 7. REST API (draft — prefix `/api/v1`)

Auth: `POST /auth/register` (referralCode?), `POST /auth/login`,
`POST /auth/logout`, `GET /auth/me`, `POST /auth/verify-email` (6-digit OTP
code), `POST /auth/resend-verification`, `POST /auth/forgot-password`,
`POST /auth/reset-password` (OTP code + new password),
`PATCH /users/me`, `PATCH /users/me/password`.

Discovery: `GET /categories`, `GET /events` (search/filter/paginate, public),
`GET /events/:eventId`, `GET /organizers/:organizerId/reviews`.

Organizer events: `POST/GET /organizer/events`, `GET/PATCH
/organizer/events/:eventId`, `POST .../publish`, `POST .../cancel`,
`POST /organizer/events/:eventId/ticket-types`,
`PATCH /organizer/ticket-types/:ticketTypeId`.

Vouchers & rewards: `POST/GET /organizer/events/:eventId/vouchers`,
`PATCH /organizer/vouchers/:voucherId`, `GET /rewards/points`,
`GET /rewards/coupons`, `POST /checkout/preview`.

Transactions: `POST /transactions`, `GET /transactions/me`,
`GET /transactions/:transactionId`,
`POST /transactions/:transactionId/payment-proof` (multipart),
`POST /transactions/:transactionId/cancel`,
`GET /organizer/transactions`,
`POST /organizer/transactions/:transactionId/accept|reject`.

Reviews & dashboard: `GET /events/:eventId/reviews`,
`POST /events/:eventId/reviews`, `PATCH /reviews/:reviewId`,
`GET /organizer/dashboard/summary`, `GET /organizer/dashboard/timeseries`,
`GET /organizer/events/:eventId/attendees`.

Ops: `GET /health`,
`POST /internal/jobs/process-expired-transactions` (scheduler secret).

Response conventions: `{ data, meta? }` on success; 400/422 field errors;
401 unauthenticated; 403 wrong role/owner; 404; 409 transition/capacity
conflict. JSON everywhere except multipart uploads.

## 8. Backend grading evidence

- SQL transactions: force an error mid-checkout → no seat/reward drift.
- Idempotent scheduler: run expiry job twice → single restoration.
- Auth tests: protected URL signed out → 401; organizer endpoint as
  customer → 403; cross-organizer access → 403.
- Unit tests per flow: auth, referral, checkout, expiry, accept/reject,
  rollback, review eligibility.
- Seed: 2 organizers, 3+ customers (1 referral link), categories, events in
  draft/published/completed/canceled, free + paid tickets, active/expired
  voucher + coupon, expiring point credits, transactions in all six statuses,
  reviews, history for day/month/year charts. Documented demo accounts.

## 9. Decisions

- Auth (2026-10-22): Moved from JWT access tokens to database-backed
  sessions (PostgreSQL `sessions` table) with `HttpOnly` secure cookies for
  web security (XSS prevention) and immediate session revocation.
- Email (2026-10-22): Resend (HTTP API, API key based) instead of personal
  Gmail SMTP to avoid sharing personal email credentials across teammates.
- Verification & reset codes (2026-10-28): Email verification and password
  reset use 6-digit OTP codes sent via Resend instead of token links.
  Codes are hashed at rest, single-use, expire within 10 minutes, and allow
  at most 5 verification attempts. Schema tables: `email_verification_codes`,
  `password_reset_codes`.
- Payment (2026-10-15): manual bank transfer + proof upload. No gateway
  for MVP.
- Reviews need organizer approval (PENDING → APPROVED/REJECTED).
- Stacking allowed: voucher + coupon + points in one checkout.
- No design/branding guidelines for MVP.
