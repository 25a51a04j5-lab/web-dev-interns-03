# Permission Matrix: Smart Recruitment & ATS

Roles: **Admin**, **HR**, **Candidate**. The same matrix is enforced on the server in
`backend/src/config/permissions.js`. Hiding a button in the UI is never treated as security.

Legend: ✅ allowed | ❌ denied (403) | 🔓 public (no login) | 👤 own records only

## 1. Authentication and Account

| Action | Admin | HR | Candidate | Notes |
|---|---|---|---|---|
| Register an account | 🔓 | 🔓 | 🔓 | Public registration always creates a **Candidate** |
| Log in | 🔓 | 🔓 | 🔓 | |
| View own profile (`/me`) | ✅ | ✅ | ✅ | |
| Create HR / Admin accounts | ✅ | ❌ | ❌ | Staff accounts are never self-registered |
| List all users | ✅ | ❌ | ❌ | |
| Change a user's role / deactivate | ✅ | ❌ | ❌ | |

## 2. Company and Jobs

| Action | Admin | HR | Candidate | Notes |
|---|---|---|---|---|
| Configure company settings | ✅ | ❌ | ❌ | |
| View published jobs | 🔓 | 🔓 | 🔓 | |
| View draft / closed / archived jobs | ✅ | ✅ | ❌ | |
| Create / edit job | ✅ | ✅ | ❌ | |
| Publish / close / archive job | ✅ | ✅ | ❌ | |

## 3. Applications and Pipeline

| Action | Admin | HR | Candidate | Notes |
|---|---|---|---|---|
| Submit application | ❌ | ❌ | ✅ | |
| View own applications and status | ❌ | ❌ | 👤 | Never sees other candidates |
| View all applications / search candidates | ✅ | ✅ | ❌ | |
| Move candidate between stages | ✅ | ✅ | ❌ | Applied → Screening → Interview → Selected → Offered |
| View stage-change history (audit trail) | ✅ | ✅ | ❌ | |

## 4. Resumes

| Action | Admin | HR | Candidate | Notes |
|---|---|---|---|---|
| Upload resume | ❌ | ❌ | 👤 | Type and size validated |
| Download own resume | ❌ | ❌ | 👤 | |
| Download any resume | ✅ | ✅ | ❌ | Access should be logged |

## 5. Interviews

| Action | Admin | HR | Candidate | Notes |
|---|---|---|---|---|
| Schedule / reschedule / cancel interview | ✅ | ✅ | ❌ | |
| View all interviews | ✅ | ✅ | ❌ | |
| View own interviews | ❌ | ❌ | 👤 | |
| Submit interview feedback | ✅ | ✅ | ❌ | |

## 6. Offers and Onboarding

| Action | Admin | HR | Candidate | Notes |
|---|---|---|---|---|
| Generate / issue offer letter | ✅ | ✅ | ❌ | From approved template only |
| View own offer | ❌ | ❌ | 👤 | |
| Accept / decline own offer | ❌ | ❌ | 👤 | |
| Manage onboarding checklist | ✅ | ✅ | ❌ | |

## 7. Analytics and System

| Action | Admin | HR | Candidate | Notes |
|---|---|---|---|---|
| View hiring analytics | ✅ | ✅ | ❌ | |
| View system activity log | ✅ | ❌ | ❌ | |

## Enforcement Rules

1. Every protected route runs `authenticate` first (no valid token → **401**).
2. Then `requireRole(...)` or `requirePermission(action)` runs (wrong role → **403**).
3. "Own records only" (👤) is checked in the service/data layer by comparing the record owner to `req.user.id`. Role alone is not enough.
4. Role comes from the signed token and is re-checked against the user record, so a deactivated or demoted user loses access immediately.
5. A client can never choose its own role at registration.
