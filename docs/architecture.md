# ATS Architecture and API Contract

## 1. Architecture overview

The application is a role-aware web system with three logical layers:

```text
React frontend
      |
      | JSON over HTTPS
      v
Express REST API
      |
      +--> Authentication and authorization middleware
      +--> Validation and workflow services
      +--> Repositories
      |
      v
PostgreSQL or MySQL database

Private resume storage
      ^
      |
Resume service stores metadata and controlled file references in the database
```

The frontend is responsible for navigation, forms, loading states, and presenting
server-provided data. The backend is responsible for identity, authorization, validation,
ownership checks, workflow transitions, persistence, and consistent errors.

## 2. Backend module boundaries

The backend should use the following boundaries:

| Layer | Responsibility |
|---|---|
| Routes | Map HTTP methods and paths to middleware and controllers |
| Middleware | Parse requests, authenticate users, authorize roles, handle errors |
| Validators | Validate request body, query parameters, and path parameters |
| Controllers | Translate HTTP requests into service calls and responses |
| Services | Apply business rules, ownership checks, and workflow transitions |
| Repositories | Read and write database records; do not make HTTP decisions |
| Storage service | Store private files and return controlled metadata |
| Database | Persist users, recruitment records, timestamps, and audit history |

Protected routes must run `authenticate` before `requireRole` or permission checks. Services
must still enforce ownership for records marked as "own records only"; a role check alone is
not sufficient.

## 3. API conventions

### Base URL

```text
/api
```

### Request and response format

- JSON is used for normal API requests and responses.
- Request bodies use `camelCase`.
- Dates are returned as ISO 8601 timestamps in UTC.
- Successful collection responses return an array or a documented object containing an array.
- Created resources return HTTP `201`.
- Successful reads and updates return HTTP `200`.
- Successful deletion or state transitions return HTTP `204` when no response body is needed.

### Authentication

Protected requests send the access token as:

```http
Authorization: Bearer <jwt>
```

The authenticated user is attached to the request as:

```json
{
  "id": 42,
  "email": "hr@example.test",
  "name": "Example HR",
  "role": "HR"
}
```

### Error contract

All API errors use the existing standard shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Email format is invalid"
      }
    ]
  }
}
```

Expected status meanings:

| Status | Meaning |
|---|---|
| `400` | Malformed request or validation failure |
| `401` | Missing, invalid, or expired authentication |
| `403` | Authenticated user lacks permission |
| `404` | Resource does not exist or is not visible to the caller |
| `409` | Duplicate or conflicting resource |
| `422` | Valid shape but invalid business transition |
| `500` | Unexpected server failure |

## 4. Route map

### Health and authentication

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/health` | Public | Check API availability |
| `POST` | `/api/auth/register` | Public | Register a candidate |
| `POST` | `/api/auth/login` | Public | Authenticate and receive a JWT |
| `GET` | `/api/auth/me` | Authenticated | Return the current user |
| `POST` | `/api/auth/users` | Admin | Create an HR or Admin account |
| `GET` | `/api/auth/users` | Admin | List users |
| `PATCH` | `/api/auth/users/:id` | Admin | Change staff role or active state |

### Companies

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/company` | Admin | Read company settings |
| `PATCH` | `/api/company` | Admin | Update company settings |

### Jobs

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/jobs` | Public | List published jobs |
| `GET` | `/api/jobs/:id` | Public or staff | Read a visible job |
| `POST` | `/api/jobs` | Admin, HR | Create a job draft |
| `PATCH` | `/api/jobs/:id` | Admin, HR | Edit a job |
| `POST` | `/api/jobs/:id/status` | Admin, HR | Perform a permitted job status transition |

### Candidate profiles and applications

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/candidates/me` | Candidate | Read own profile |
| `PATCH` | `/api/candidates/me` | Candidate | Update own profile |
| `POST` | `/api/jobs/:jobId/applications` | Candidate | Submit an application |
| `GET` | `/api/applications` | Admin, HR | Search and list applications |
| `GET` | `/api/applications/:id` | Owner, Admin, HR | Read an application |
| `PATCH` | `/api/applications/:id/stage` | Admin, HR | Move an application stage |
| `GET` | `/api/applications/:id/history` | Admin, HR, owner | Read visible stage history |

### Resumes

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/candidates/me/resume` | Candidate | Upload or replace own resume |
| `GET` | `/api/candidates/me/resume` | Candidate | Download own resume |
| `GET` | `/api/applications/:id/resume` | Admin, HR | Download an application resume |

### Interviews

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/applications/:id/interviews` | Admin, HR | Schedule an interview |
| `GET` | `/api/interviews` | Admin, HR | List interviews |
| `GET` | `/api/interviews/me` | Candidate | List own interviews |
| `PATCH` | `/api/interviews/:id` | Admin, HR | Reschedule or cancel |
| `POST` | `/api/interviews/:id/feedback` | Admin, HR | Submit feedback |

### Offers and onboarding

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/applications/:id/offers` | Admin, HR | Issue an offer |
| `GET` | `/api/offers/me` | Candidate | List own offers |
| `PATCH` | `/api/offers/:id/response` | Candidate owner | Accept or decline an offer |
| `GET` | `/api/applications/:id/onboarding` | Admin, HR, candidate owner | Read onboarding tasks |
| `POST` | `/api/applications/:id/onboarding/tasks` | Admin, HR | Add an onboarding task |
| `PATCH` | `/api/onboarding/tasks/:id` | Admin, HR, candidate owner | Update task status |

### Analytics and activity

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/analytics/overview` | Admin, HR | Summary hiring metrics |
| `GET` | `/api/analytics/pipeline` | Admin, HR | Stage counts and conversion |
| `GET` | `/api/activity` | Admin | Search system activity |

The route map is the target contract. A route should not be exposed until its validation,
authorization, service, repository, and tests are implemented.

## 5. Main data flows

### 5.1 Candidate application flow

```text
Candidate
  -> GET /api/jobs
  -> GET /api/jobs/:id
  -> POST /api/jobs/:jobId/applications
       -> authenticate
       -> require candidate permission
       -> validate job is published
       -> validate candidate does not already have an application
       -> persist application and audit event
  <- 201 application
```

### 5.2 Staff pipeline flow

```text
HR/Admin
  -> PATCH /api/applications/:id/stage
       -> authenticate
       -> require HR/Admin permission
       -> load application
       -> validate allowed transition
       -> update application and create stage-history record
       -> create activity/notification event
  <- 200 application with current stage
```

### 5.3 Resume flow

```text
Candidate
  -> multipart upload
       -> authenticate
       -> verify candidate owns the destination
       -> validate extension, MIME type, and size
       -> write to private storage with generated server filename
       -> persist metadata, never the raw public path
  <- 201 resume metadata
```

Downloads must stream through an authenticated endpoint. The API must not expose the private
storage directory as a public static folder.

## 6. Workflow rules

### Application stages

The initial forward transitions are:

```text
Applied -> Screening -> Interview -> Selected -> Offered
```

The service may support a documented rejection or withdrawal state. A client cannot set an
arbitrary stage, skip required transitions, or modify stage history directly.

### Job states

```text
Draft -> Published -> Closed -> Archived
```

Only the permitted role can perform each transition. Published jobs are visible publicly;
draft, closed, and archived jobs require staff authorization.

### Offer states

```text
Draft -> Issued -> Accepted
                \-> Declined
```

Candidates can respond only to their own issued offer. Staff cannot silently change a
candidate's response; corrections must be recorded as an auditable action.

## 7. Database and storage boundaries

The initial relational model should include:

```text
users
companies
candidate_profiles
jobs
applications
application_stage_history
resumes
interviews
interview_feedback
offers
onboarding_tasks
activity_logs
notification_events
```

Foreign keys, unique constraints, status checks, and timestamps belong in the database as
well as in application validation. The database design and migrations will be delivered in a
separate implementation part.
