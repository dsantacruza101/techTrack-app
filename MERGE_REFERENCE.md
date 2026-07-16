# TechTrack — Logic, Rules & Methods Reference

Extraction of every business rule, permission, Firestore schema, and service method in this codebase, for integrating this project's functionality into another app. Not a user-facing doc — written for a developer porting logic, so it favors exact signatures/types over prose.

---

## 1. Tech Stack

- React 19 + TypeScript (Vite), react-router-dom v7
- Firebase 12 — Firestore (data), Firebase Auth (email/password + Google), Cloud Functions v2
- PrimeReact 10 + PrimeFlex 4 (UI)
- Resend (transactional email, called from Cloud Functions only — never from the client)

Env vars (`.env`, Vite-prefixed for client; `RESEND_API_KEY` is Cloud Functions-side only):
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
RESEND_API_KEY=
```
Optional Cloud Functions env: `INVITE_FROM_EMAIL` (defaults to `noreply@techtrack.app` / `reports@techtrack.app`).

**⚠ Multiple Firebase projects gotcha (bit us in production on 2026-07-15)**: this repo's `.env` is gitignored and contains **two blocks** of the same vars — a "Production" block (`techtrack-app-7f085`, the real deploy target with custom domain `techtrackapp.org`) and a "Demo" block (`techtrack-portfolio-demo`, a separate portfolio-demo Firebase project). Whichever block is left **uncommented** is what `npm run build` bakes into the bundle — nothing enforces which one is active. It's trivially easy to build+deploy with the wrong project's credentials silently (auth still "works" locally in the sense of not crashing, it just points at the wrong project's users/Firestore/authorized-domains, producing confusing errors like "domain not authorized for OAuth" even when the *correct* project's authorized-domains list is configured correctly). If porting this pattern to another app: either use separate `.env.production`/`.env.demo` files selected by build command (Vite mode), or at minimum add a build-time assertion that fails loudly if `VITE_FIREBASE_PROJECT_ID` doesn't match the expected deploy target — don't rely on a human remembering which block is commented.

---

## 2. Auth & Permissions System

### Roles
```ts
type Role = 'superAdmin' | 'admin' | 'user'
```

### Auth flow rules (business rule, not enforced by Firebase itself — enforced in `authService`/`AuthContext`)
- **superAdmin**: signs in with email + password only.
- **admin / user**: Google sign-in only. There is no public self-registration route.
- An admin/superAdmin pre-creates a `pendingUsers` doc (email, displayName, role) via `userService.registerByEmail`. On that email's **first Google sign-in**, `AuthContext` looks it up via `userService.findPendingByEmail` and promotes it to a real `users/{uid}` doc via `userService.promotePendingUser` (deletes the pending doc).
- `authService.login` (email/password) and `authService.loginWithGoogle` both check `UserProfile.isActive` post-auth and force sign-out + throw if disabled or unregistered:
  - `AccountDisabledError` — profile exists but `isActive === false`
  - `AccountNotRegisteredError` — Google sign-in with no matching `users` doc and no pending registration
- Firebase Auth UID is used directly as the Firestore document ID for `users/{uid}` — no separate UUID.

### Permission list (`Permission` union type)
```
add_asset, edit_asset, delete_asset, replicate_asset, export_csv,
manage_categories,
invite_users, disable_users, change_roles, delete_users, create_super_admin,
log_care, manage_care_tasks,
create_work_order, edit_work_order, delete_work_order, update_wo_status,
submit_it_ticket, manage_it_tickets,
log_inventory, manage_inventory,
edit_map,
view_finance, view_reports,
manage_settings, manage_integrations, import_data
```

### Role → permission baseline (`ROLE_PERMISSIONS`)
| Permission | superAdmin | admin | user |
|---|---|---|---|
| add/edit/delete/replicate_asset, export_csv | ✅ | ✅ | ❌ |
| manage_categories | ✅ | ✅ | ❌ |
| invite_users, disable_users | ✅ | ✅ | ❌ |
| change_roles, delete_users, create_super_admin | ✅ | ❌ | ❌ |
| log_care | ✅ | ✅ | ✅ |
| manage_care_tasks | ✅ | ✅ | ❌ |
| create_work_order, update_wo_status | ✅ | ✅ | ✅ |
| edit_work_order, delete_work_order | ✅ | ✅ | ❌ |
| submit_it_ticket | ✅ | ✅ | ✅ |
| manage_it_tickets | ✅ | ✅ | ❌ |
| log_inventory | ✅ | ✅ | ✅ |
| manage_inventory | ✅ | ✅ | ❌ |
| edit_map | ✅ | ✅ | ❌ |
| view_finance, view_reports | ✅ | ✅ | ❌ |
| manage_settings | ✅ | ✅ | ❌ |
| manage_integrations, import_data | ✅ | ❌ | ❌ |

**Extension mechanism**: a `user`-role account can be granted extra capability without a role change via `UserProfile.permissions: Permission[]`. Check order is role-baseline OR individual-grant:
```ts
const can = (permission) => ROLE_PERMISSIONS[role].includes(permission) || (userProfile.permissions ?? []).includes(permission)
```
This is the whole of `usePermissions()` — `can(p)`, `canAny(p[])` (some), `canAll(p[])` (every).

### UserProfile schema
```ts
interface UserProfile {
  uid: string          // = Firestore doc ID = Firebase Auth UID
  email: string
  displayName: string
  role: Role
  isActive: boolean
  permissions: Permission[]   // optional grants beyond role baseline
}

interface PendingUser {       // pre-registered, not yet signed in
  id: string
  email: string
  displayName: string
  role: Role
  createdAt: number
}
```

---

## 3. Firestore Data Model

| Collection | Shape | Notes |
|---|---|---|
| `users/{uid}` | `UserProfile` | doc ID = Auth UID |
| `pendingUsers/{id}` | `PendingUser` | deleted on promotion |
| `assets/{id}` | see below | soft-delete via `isDeleted` |
| `categories/{id}` | see below | soft-delete via `isDeleted` |
| `workOrders/{id}` | see below | hard delete |
| `itTickets/{id}` | see below | hard delete only via admin |
| `inventory/{id}` | see below + `/logs/{id}` subcollection | soft-delete |
| `mapRooms/{id}` | see below | hard delete |
| `settings/app` | `AppSettings` | single doc, `doc(db,'settings','app')` |
| `scheduledReports/{id}` | see below | `nextSendAt`/`lastSentAt` written only by Cloud Function |

### Asset
```ts
interface Asset {
  id: string
  name: string
  brand: string
  model: string
  categoryId: string
  subcategoryId: string     // NOTE: stores the subcategory *string value*, not a real foreign-key id — Category.subcategories is just string[]
  school: string             // 'school_a' | 'school_b' (see AppSettings for display names)
  status: 'active' | 'maintenance' | 'storage' | 'retired'
  serialNumber: string
  assetTag: string
  purchaseDate: Timestamp
  purchasePrice: number
  estimatedValue: number
  lifespanYears: number
  warrantyExpiry: Timestamp | null
  assignedTo: string
  location: string
  notes: string
  careCompletions: Record<string, Timestamp>       // keyed by CareTask.id
  careCompletionCosts?: Record<string, number>     // keyed by CareTask.id
  isDeleted: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```
**Derived business logic** (`asset.types.ts`), not stored — computed on read:
```ts
// % of lifespan elapsed = (now - purchaseDate) / (lifespanYears * 365.25 days)
getLifespanPercent(purchaseDate, lifespanYears): number   // 0..1
getLifespanStatus(purchaseDate, lifespanYears): 'good' | 'aging' | 'replace'
// good: <50% elapsed, aging: 50-80%, replace: >=80%
```
Assets rules permission model (see §4): everyone authenticated can read; only admin/superAdmin can create/delete/full-update; **any** authenticated user can update `careCompletions` alone (used for logging care from the field without admin rights).

### Category
```ts
interface Category {
  id: string
  name: string
  icon: string             // PrimeIcon class, e.g. 'pi pi-desktop'
  colorKey: 'blue'|'cyan'|'purple'|'green'|'yellow'|'red'|'orange'
  subcategories: string[]  // plain strings, no sub-ids
  careTasks: CareTask[]
  isDeleted: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
interface CareTask {
  id: string               // client-generated: `t_${Date.now()}_${counter}`
  task: string
  freq: 'daily'|'weekly'|'monthly'|'quarterly'|'annually'|'asneeded'
  description: string
}
```
"Maintenance due" business rule (used by the maintenance_due report, `functions/src/index.ts`): an asset is overdue if `Object.keys(asset.careCompletions).length < category.careTasks.filter(t => t.freq !== 'asneeded').length`. (Simplified — doesn't check *which* tasks are done, just the count vs. non-"as needed" task count.)

### WorkOrder
```ts
interface WorkOrder {
  id: string
  title: string
  category: string          // free text, not a categoryId FK
  priority: 'critical'|'high'|'medium'|'low'
  status: 'open'|'inprogress'|'completed'|'onhold'|'cancelled'
  assignedTo: string
  assetId: string
  dueDate: Timestamp | null
  estimatedCost: number
  notes: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### ITTicket
```ts
interface ITTicket {
  id: string
  title: string
  category: 'hardware'|'software'|'network'|'account'|'printer'|'setup'|'other'
  priority: 'low'|'medium'|'high'|'critical'
  status: 'open'|'inprogress'|'resolved'|'closed'
  reportedBy: string
  location: string
  assetId: string
  description: string
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### InventoryItem (+ subcollection `logs`)
```ts
interface InventoryItem {
  id: string
  name: string
  categoryId: string
  unit: string
  inStock: number
  lowStockThreshold: number
  notes: string
  isDeleted: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
interface StockLog {         // inventory/{itemId}/logs/{id}
  id: string
  change: number              // signed delta
  note: string
  createdBy: string
  createdAt: Timestamp
}
stockStatus(item): 'ok' | 'low' | 'out'
// out: inStock === 0, low: inStock <= lowStockThreshold, else ok
```

### MapRoom
```ts
interface MapRoom {
  id: string
  label: string
  icon: string
  color: 'blue'|'green'|'purple'|'yellow'|'red'|'orange'|'cyan'
  floor: string
  x: number; y: number; w: number; h: number   // absolute pixel layout on the facility map canvas
}
```

### AppSettings (`settings/app`, single doc)
```ts
interface AppSettings {
  appTitle: string
  appSubtitle: string
  schoolAName: string
  schoolBName: string
}
const DEFAULT_SETTINGS = { appTitle: 'TechTrack', appSubtitle: 'Asset Management', schoolAName: 'School A', schoolBName: 'School B' }
```

### ScheduledReport
```ts
interface ScheduledReport {
  id: string
  reportType: 'asset_summary'|'maintenance_due'|'wo_status'|'it_inventory'|'depreciation'
  frequency: 'weekly'|'monthly'|'quarterly'
  recipientEmail: string        // single recipient only — known limitation, see below
  createdAt: Timestamp
  createdBy: string
  lastSentAt: Timestamp | null
  nextSendAt: Timestamp          // only the Cloud Function writes this
  isActive: boolean
}
computeNextSendAt(freq): Date
// weekly: +7 days at 08:00; monthly: 1st of next month 08:00; quarterly: 1st of next quarter 08:00
```
**Known limitation to fix if porting**: `recipientEmail` is a single string. If the target app needs multi-recipient alerts, change to `recipientEmails: string[]` and update `sendScheduledReports` to loop `resend.emails.send` per recipient (or use Resend's array `to` field).

---

## 4. Firestore Security Rules (full, current production state)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() { return request.auth != null; }
    function isAdminOrSuperAdmin() {
      return isAuthenticated() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin','superAdmin'];
    }
    function isSuperAdmin() {
      return isAuthenticated() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'superAdmin';
    }

    match /users/{userId} {
      allow read, write: if isAdminOrSuperAdmin();
      allow read, write: if isAuthenticated() && request.auth.uid == userId;
    }
    match /assets/{assetId} {
      allow read: if isAuthenticated();
      allow create, delete: if isAdminOrSuperAdmin();
      allow update: if isAdminOrSuperAdmin();
      allow update: if isAuthenticated() &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['careCompletions','updatedAt']);
    }
    match /categories/{categoryId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAdminOrSuperAdmin();
    }
    match /workOrders/{woId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAdminOrSuperAdmin() ||
        (isAuthenticated() && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status','updatedAt']));
      allow delete: if isAdminOrSuperAdmin();
    }
    match /itTickets/{ticketId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAdminOrSuperAdmin();
    }
    match /inventory/{itemId} {
      allow read: if isAuthenticated();
      allow create, delete: if isAdminOrSuperAdmin();
      allow update: if isAdminOrSuperAdmin();
      allow update: if isAuthenticated() &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['inStock','updatedAt']);
    }
    match /inventory/{itemId}/logs/{logId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAdminOrSuperAdmin();
    }
    match /mapRooms/{roomId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAdminOrSuperAdmin();
    }
    match /settings/{docId} {
      allow read: if isAuthenticated();
      allow write: if isAdminOrSuperAdmin();   // fixed 2026-07-14, was isSuperAdmin() — see MEMORY project_client_bug_reports
    }
    match /pendingUsers/{docId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isAdminOrSuperAdmin();
    }
    match /scheduledReports/{reportId} {
      allow read, create, delete: if isAdminOrSuperAdmin();
      allow update: if false;   // only Cloud Functions (Admin SDK bypasses rules) update lastSentAt/nextSendAt
    }
    match /{document=**} { allow read, write: if false; }
  }
}
```

**Known gap, not fixed** (flag for the target app if it matters there): `users/{userId}` allows *any* `admin` (not just superAdmin) to write any field on any user doc, including `role`. Client-side permission checks (`change_roles`, `create_super_admin` are superAdmin-only in `ROLE_PERMISSIONS`) are not mirrored in the rule — an admin could self-escalate via a direct Firestore write bypassing the UI. If the merge target needs strict role-change security, add a rule clause restricting `role`/`permissions` field writes to `isSuperAdmin()`.

**Recurring bug pattern to watch for when porting**: client-side permission grants (`rolePermissions.ts`) and Firestore rule conditions must be kept in sync manually — nothing enforces it. That's exactly what caused the settings-save bug fixed today.

---

## 5. Service Layer — Method Reference

All services follow the same shape: plain object literals wrapping Firestore SDK calls, returning `Promise<boolean>` for mutations (`true`/`false`, swallowing errors — **no error detail surfaces to the caller**, a pattern worth improving if porting), and exposing a `subscribeToX(cb, onError?)` real-time listener for reads. No class-based repositories, no DI container — services are imported directly (`import { assetService } from '...'`).

| Service | Methods |
|---|---|
| `authService` | `login(email,pw)`, `loginWithGoogle()`, `logout()`, `onAuthChanged(cb)`, `getUserProfile(uid)` |
| `userService` | `subscribeToAll(cb)`, `subscribeToPending(cb)`, `setActive(uid,bool)`, `setRole(uid,role)`, `remove(uid)`, `removePending(id)`, `registerByEmail({email,displayName,role})`, `findPendingByEmail(email)`, `promotePendingUser(uid,pending,googleDisplayName?)` |
| `assetService` | `subscribeToAll(cb)`, `subscribeToActive(cb)`, `create(data)`, `update(id,data)`, `softDelete(id)`, `restore(id)`, `replicate(asset)` (duplicates all fields except serial/tag/assignedTo/careCompletions, appends " (Copy)"), `logCare(assetId,taskId,date,cost?)` (dot-path update to `careCompletions.{taskId}` / `careCompletionCosts.{taskId}`) |
| `categoryService` | `subscribeToActive(cb)`, `subscribeToAll(cb)`, `create(data)`, `update(id,data)`, `softDelete(id)`, `restore(id)` |
| `workOrderService` | `subscribeToAll(cb,onError?)`, `create(data)`, `update(id,data)`, `updateStatus(id,status)`, `delete(id)` |
| `itTicketService` | `subscribeToAll(cb,onError?)`, `create(data)`, `update(id,data)` |
| `inventoryService` | `subscribeToActive(cb,onError?)`, `create(data)`, `update(id,data)`, `softDelete(id)`, `logStockChange(itemId,change,note,createdBy)` (writes a log doc + bumps `updatedAt` in parallel via `Promise.all`) |
| `mapRoomService` | `subscribeToAll(cb,onError?)`, `create(data)`, `update(id,data)`, `delete(id)` |
| `settingsService` | `subscribe(cb)`, `get()`, `save(data)` (uses `setDoc(..., {merge:true})`) |
| `scheduledReportService` | `subscribeToActive(cb)`, `create({reportType,frequency,recipientEmail,createdBy})` (client-computes `nextSendAt` via `computeNextSendAt`), `delete(id)` |
| `categoryService` add-on used only from Options page | direct `setDoc`/`updateDoc` calls for JSON import/export and CSV import (not part of the service object — inline in `OptionsPage.tsx`/`CSVImportModal.tsx`) |

`usePermissions()` (`can`, `canAny`, `canAll`) is the only cross-cutting hook — every page/component gates UI on it, but as noted in §4 the server-side rules don't always mirror it 1:1.

---

## 6. Cloud Functions (`functions/src/index.ts`)

Two `onCall`/`onSchedule` v2 functions, region `us-central1`, `maxInstances: 10`.

### `inviteUser` (onCall, requires auth)
1. Verifies caller's `users/{uid}.role` is `admin` or `superAdmin` (throws `permission-denied` otherwise).
2. Validates `{email, displayName, role}` present.
3. Rejects if a `users` doc with that email already exists (`already-exists`).
4. `admin.auth().createUser({email, displayName, emailVerified:false})`.
5. Writes `users/{uid}` doc directly (bypasses client rules via Admin SDK) with `isActive:false, permissions:[]`.
6. Generates a password-reset link (`generatePasswordResetLink`) and emails it via Resend if `RESEND_API_KEY` is set; otherwise just logs the link to Cloud Functions console (dev fallback).
7. Returns `{ uid }`.

### `sendScheduledReports` (onSchedule, daily cron `"0 8 * * *"` UTC)
1. Queries `scheduledReports` where `isActive == true && nextSendAt <= now`.
2. Bails early if `RESEND_API_KEY` unset (logs a warning, does nothing — reports silently don't send in that case).
3. Loads all `assets` (`isDeleted==false`), `categories` (`isDeleted==false`), `workOrders` once, shared across every due report.
4. For each due report: generates an HTML email body via `generateReportHtml(reportType, assets, categories, workOrders, catMap)` (5 report types — asset_summary, maintenance_due, wo_status, it_inventory, depreciation — each with its own inline HTML table/stat-block builder, dark-themed, self-contained inline styles for email client compatibility), sends via Resend, then updates `lastSentAt`/`nextSendAt` on the report doc. Uses `Promise.allSettled` so one failing report doesn't block others.
5. Report HTML generation logic worth reusing as-is if porting the reporting feature — it's pure functions of `(assets, categories, workOrders)` arrays with no Firestore coupling inside `generateReportHtml` itself.

---

## 7. CSV Import/Export (added 2026-07-14, `src/features/settings/`)

- `utils/csv.ts` — hand-rolled RFC4180 parser (`parseCSV(text): string[][]`, handles quoted fields/embedded commas/newlines/`""` escapes, no external dependency), plus `parseCSVNumber`/`parseCSVDate` coercion helpers.
- `components/CSVImportModal.tsx` — column-mapping importer: auto-guesses TechTrack field ↔ CSV header via an alias list (`FIELD_DEFS`), lets the user remap any column via dropdown, matches free-text category names against existing `Category.name` (case-insensitive; no match → imported uncategorized, flagged in the summary), writes rows sequentially via `assetService.create` (no batching — fine for tens of rows, slow for hundreds).
- Existing (pre-dating this session): CSV **export** (`exportCSV` in `OptionsPage.tsx`, plain `assets.map` → quoted CSV string → blob download) and full JSON backup export/import (round-trips both `assets` and `categories` with Firestore Timestamp conversion).

---

## 8. Things to decide before merging

1. **Multi-tenancy assumption**: this app hardcodes a 2-school model (`school_a`/`school_b` with display names in `AppSettings`). If the target app needs N schools/sites, this needs to become a real collection instead of a fixed enum.
2. **Permission/rule sync**: port `ROLE_PERMISSIONS` and the Firestore rules *together*, and keep them literally side-by-side in review — this codebase's one real bug this cycle was them drifting apart (§4).
3. **Silent error swallowing**: virtually every service method returns `boolean` and swallows the actual Firestore error. If the target app has better error surfacing conventions, this is worth improving during the port rather than copying as-is.
4. **Scheduled reports = single recipient**: decide up front if the target app needs multi-recipient or true real-time alerts (see §3 ScheduledReport note) — changes the schema before you build UI on top of it.
5. **Multiple-Firebase-project `.env` footgun**: see the ⚠ note in §1 — don't copy the "two commented blocks in one `.env`" pattern into the merged app; use Vite mode-based env files or a build-time project-ID assertion instead.
