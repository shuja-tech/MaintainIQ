# TODO

## Phase 1: Admin Approval Request System — COMPLETE ✅
### (Prevents unauthorized admin registration)

### Database Changes
- [x] `profiles.role` default changed from `'admin'` → `'technician'`
- [x] `handle_new_user()` trigger: ALL new users get role `'technician'` (never trusts metadata)
- [x] New `admin_requests` table (id, user_id, full_name, email, status, reviewed_by, reviewed_at, created_at)
- [x] RLS policies: admins read all, users read own, only admins update
- [x] RLS policy: admins can update any profile

### AuthContext (`src/context/AuthContext.jsx`)
- [x] `signUp()` always sends `role: 'technician'` to backend
- [x] `createAdminRequest()` — creates pending request
- [x] `getPendingAdminRequests()` — admin-only fetch
- [x] `approveAdminRequest()` — approves + upgrades profile role
- [x] `rejectAdminRequest()` — rejects request
- [x] `checkPendingAdminRequest()` — auto-check on auth state change
- [x] `hasPendingAdminRequest` state exposed

### Register Page (`src/pages/Register.jsx`)
- [x] Default role: `'technician'`
- [x] Admin option labeled "Administrator (requires approval)" with helper text
- [x] On admin signup → redirect to `/dashboard?adminRequest=1`
- [x] Button disabled when pending request exists

### Dashboard (`src/pages/Dashboard.jsx`)
- [x] Admin request prompt when `?adminRequest=1` param present
- [x] Success message after submitting request
- [x] "Pending Admin Requests" section (admin-only) with Approve/Reject buttons
- [x] Badge count for pending requests

### Navbar
- [x] SearchModal + Ctrl+K hotkey
- [x] Audit nav link (admin-only)

### App.jsx
- [x] `/audit` route added (admin-only via ProtectedRoute)

### Home.jsx
- [x] Fixed unbalanced div structure (self-closing div vs regular div)

## Phase 2: 2FA for Administrator Role
- [ ] Pending decision on implementation approach

## Supabase Migrations
- [x] `supabase/migration_admin_approval.sql` — migration file
- [x] `supabase/schema.sql` — merged all changes into main schema
- [x] `supabase/migration_audit_log.sql` — audit log migration

## Audit Log Fix
### (Audit page was empty because logAuditEvent() was never called)
- [x] `AssetNew.jsx` — audit event on asset creation
- [x] `AssetDetails.jsx` — audit event on asset edit + technician assignment
- [x] `IssueDetails.jsx` — audit event on issue assign + status change
- [x] `PublicAssetPage.jsx` — audit event on issue reported by public
- [x] `AuthContext.jsx` — audit event on admin approve/reject
</create_file>
