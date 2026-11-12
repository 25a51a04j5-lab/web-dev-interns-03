# Auth Module (Week 1): Krithiha

Authentication foundations and server-side role enforcement for the ATS backend.

## Design decisions

| Topic | Decision |
|---|---|
| Passwords | Hashed with bcrypt (`bcryptjs`), cost from `BCRYPT_ROUNDS`; never stored or returned in plain text |
| Sessions | Stateless JWT (HS256), expires after `JWT_EXPIRES_IN` (default 1h) |
| Roles | `ADMIN`, `HR`, `CANDIDATE`, defined once in `src/config/permissions.js` |
| Registration | Public sign-up always creates a `CANDIDATE`. Staff (HR/Admin) are created by an Admin only |
| Role source | The role is read from the database on every request, not trusted from the token |
| Errors | `401` = not logged in / bad or expired token. `403` = logged in but not allowed. `400` = validation. `409` = duplicate email |
| Login errors | Same message for unknown email, wrong password and disabled account (no user enumeration) |

## Endpoints

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create a candidate account |
| POST | `/api/auth/login` | Public | Get a JWT |
| GET | `/api/auth/me` | Logged in | Current user |
| POST | `/api/auth/users` | Admin | Create HR/Admin account |
| GET | `/api/auth/users` | Admin | List users |
| GET | `/api/admin/ping` | Admin | Role-check demo |
| GET | `/api/hr/ping` | Admin, HR | Role-check demo |
| GET | `/api/candidate/ping` | Candidate | Role-check demo |

Send the token as `Authorization: Bearer <token>`.

Error body (always this shape):
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Validation failed", "details": [{ "field": "email", "message": "Email format is invalid" }] } }
```

## Using the middleware in other routes

```js
const authenticate = require('./middleware/authenticate');
const { requireRole, requirePermission } = require('./middleware/requireRole');

router.post('/jobs', authenticate, requireRole('ADMIN', 'HR'), createJob);
router.get('/analytics', authenticate, requirePermission('analytics:view'), getAnalytics);
```

`authenticate` must come first. It sets `req.user = { id, email, role, name }`.

## Merging into Narendra's skeleton

In the main `app.js`, after `express.json()`:

```js
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api', require('./routes/protectedRoutes')); // demo routes, remove later
// ...
app.use(notFoundHandler);   // from middleware/errorHandler.js
app.use(errorHandler);      // must be the LAST middleware
```

## Connecting to the real database

`src/repositories/userRepository.js` is an in-memory placeholder. After Krishna's `users` migration lands,
replace the function bodies with SQL queries (same function names and return shapes):
`create`, `findByEmail`, `findById`, `list`, `setActive`.
Expected columns: `id, name, email (unique), password_hash, role, is_active, created_at`.
Return `passwordHash` / `isActive` in camelCase from the repository.

## Run and test

```bash
cd backend
cp .env.example .env     # set JWT_SECRET
npm install
npm test                 # 23 tests
npm start
```

## Known gaps (future work)

- In-memory user store (replaced once the DB schema is merged)
- No login rate limiting / account lockout
- No refresh tokens or logout/token revocation (short expiry is the mitigation)
- No password reset or email verification
