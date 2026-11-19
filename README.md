# Smart Recruitment & Applicant Tracking System (ATS)

Northstar ATS is a team-built recruitment platform prototype for administrators, HR staff,
and candidates. It centralizes jobs, applications, pipeline stages, resumes, interviews,
offers, onboarding, and hiring analytics behind server-side access control.

## Current Week 1 deliverables

The repository currently includes:

- Requirements and role-specific user journeys
- Layered backend architecture and API route contract
- MySQL initial schema and synthetic seed data
- JWT authentication with bcrypt password hashing
- Admin, HR, and Candidate role enforcement
- MySQL-backed repositories with a test-only in-memory fallback
- Job creation, publishing, closing, archiving, and public visibility
- Candidate applications and controlled pipeline transitions
- Private PDF resume upload and protected downloads
- React/Vite dashboard shell for the three roles
- Automated backend tests for authentication, jobs, applications, and resumes

Detailed design documents:

- [Requirements and user journeys](docs/requirements.md)
- [Architecture and API contract](docs/architecture.md)
- [Permission matrix](docs/permission-matrix.md)
- [Authentication module](docs/auth-README.md)

## Technology stack

- Backend: Node.js, Express, MySQL, JSON Web Tokens, bcryptjs
- Frontend: React and Vite
- Testing: Jest and Supertest
- File storage: private local storage for development; database stores resume metadata

## Repository structure

```text
backend/
  src/
    config/          Environment, database, and storage configuration
    controllers/     HTTP request handlers
    middleware/      Authentication, authorization, and errors
    repositories/   Persistence adapters
    routes/          Express route definitions
    services/        Business rules and workflows
    validators/      Request validation
  tests/             Backend unit/integration-style API tests
database/
  migrations/       MySQL schema
  seed/             Synthetic development data
frontend/
  src/              React dashboard shell
docs/                Requirements, architecture, and security design
uploads/             Ignored private local file storage
```

## Backend setup

Requirements:

- Node.js 18 or newer
- MySQL 8 or newer for persistent development

Install dependencies and configure the environment:

```bash
cd backend
npm install
cp .env.example .env
```

Set the MySQL connection settings and a long random `JWT_SECRET` in `backend/.env`:

```env
PORT=5000
NODE_ENV=development
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_NAME=ats
DATABASE_USER=root
DATABASE_PASSWORD=your-password
JWT_SECRET=replace-with-a-long-random-value
JWT_EXPIRES_IN=1h
BCRYPT_ROUNDS=10
```

Create the database, then apply the schema and synthetic data from the repository root:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS ats"
mysql -u root -p ats < database/migrations/001_initial_schema.sql
mysql -u root -p ats < database/seed/001_demo_seed.sql
```

Start the API:

```bash
cd backend
npm start
```

Health check:

```bash
curl http://localhost:5000/api/health
```

For local tests, leave the MySQL settings empty. The development/test in-memory adapter will be
used; it must not be used for production.

## Frontend setup

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

The Vite development server prints the local URL. To create a production build:

```bash
npm run build
```

The current frontend is a dashboard shell with role preview data. API wiring and complete
feature pages are subsequent implementation work.

## Test and verification commands

Run all backend tests:

```bash
cd backend
npm test
```

The current suite covers:

- Candidate registration and login
- Password and token failures
- Role and account-state enforcement
- Admin user management
- Job visibility and status transitions
- Duplicate and unauthorized applications
- Application stage transitions and history
- Resume validation, ownership, and protected downloads

Build the frontend:

```bash
cd frontend
npm run build
```

## Initial demo accounts

The seed script creates synthetic accounts. The password for all seeded accounts is:

```text
DemoPass123!
```

| Role | Email |
|---|---|
| Admin | `admin@northstar.example.test` |
| HR | `hr@northstar.example.test` |
| Candidate | `casey@candidate.example.test` |
| Candidate | `jordan@candidate.example.test` |

These credentials are for local demonstrations only.

## Security and data handling

- Never commit `.env` files, credentials, real resumes, or personal data.
- Public registration always creates a Candidate account.
- Protected routes authenticate before checking permissions.
- "Own records only" access is checked in the service/data layer.
- Resume files are stored outside public static assets with generated storage names.
- Synthetic data uses `.example.test` domains.
- Email delivery, notifications, and external integrations are not claimed to be production
  connected.

## Current limitations and next work

The Week 1 foundation is in place. Remaining product work includes:

- Complete frontend authentication and API integration
- Candidate profile pages and richer job/application screens
- Interview scheduling and feedback
- Offer generation and candidate responses
- Onboarding workflow
- Notification delivery and retry handling
- Hiring analytics queries and dashboard
- Browser-based end-to-end testing
- Deployment configuration and production storage
