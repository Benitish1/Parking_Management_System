# Smart Parking Management System

A **production-grade, full-stack Car Parking Management System**, rebuilt from a monolith into a **true microservices architecture**.

> Register parkings, track car entries & exits, auto-bill drivers by duration, verify accounts via email OTP, and view real-time analytics — all behind a single API Gateway with a premium React dashboard.

---

## ✨ Highlights

- **7 independent microservices** + **API Gateway** + **React/Vite frontend**
- **PostgreSQL** everywhere (Sequelize ORM) — **no SQLite anywhere**
- **JWT auth** with **email OTP verification** after signup (not on every login)
- **Two roles** — `admin` (full control) and `attendant` (read-only parking view)
- **Service-to-service calls**: Auth → Notification (OTP), Car-Entry → Parking (occupy/release spaces)
- **Swagger UI** docs on every service
- **Premium UI**: glassmorphism, gradients, Framer Motion, animated counters, dark/light mode, Recharts analytics, skeleton loaders, confirm dialogs, toasts, pagination everywhere
- **Security**: Helmet, CORS, bcrypt, rate limiting, XSS sanitization, input validation, parameterized queries (SQL-injection safe)
- **Logging**: Winston (request/error/auth logs to files) + Morgan
- **Separate backend & frontend**: `backend/` (7 microservices) and `frontend/` are independent projects; each has its own `npm run dev`

---

## 🏗️ Architecture

```
                         ┌──────────────────────────┐
                         │   React + Vite frontend   │   :5173
                         │  (Tailwind, Framer Motion)│
                         └─────────────┬─────────────┘
                                       │  REST (axios)
                                       ▼
                         ┌──────────────────────────┐
                         │       API GATEWAY         │   :4000
                         │  (http-proxy-middleware)  │
                         └──┬───┬───┬───┬───┬───┬─────┘
        ┌───────────────────┘   │   │   │   │   └───────────────────┐
        ▼                       ▼   ▼   ▼   ▼                       ▼
 ┌────────────┐  ┌────────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────┐
 │   Auth     │  │   User     │ │ Parking  │ │ Car-Entry │ │  Report  │ │ Notification │
 │  :4001     │  │  :4002     │ │  :4003   │ │   :4004   │ │  :4005   │ │    :4006     │
 │ signup/otp │  │ user mgmt  │ │ CRUD     │ │ entry/exit│ │ reports  │ │ OTP email    │
 │ login/jwt  │  │            │ │ occupancy│ │ tickets   │ │ analytics│ │ (nodemailer) │
 └─────┬──────┘  └─────┬──────┘ └────┬─────┘ └─────┬─────┘ └────┬─────┘ └──────▲───────┘
       │               │             │             │            │              │
       │  Auth ───────────────────── OTP email ───────────────────────────────┘
       │               │             ▲             │            │
       │               │             └── occupy/release ────────┘
       └───────────────┴─────────────┴─────────────┴────────────┘
                                   ▼
                      ┌─────────────────────────┐
                      │   PostgreSQL  :5432      │
                      │  (shared `parking_db`)   │
                      └─────────────────────────┘
```

**Why shared DB?** Each service owns and migrates only its own models; this keeps services independently deployable while avoiding cross-service data duplication for a system of this size. The two genuinely cross-cutting operations are done over HTTP (true microservice communication), not direct table writes:
- **Car-Entry → Parking**: decrement/increment `availableSpaces` on entry/exit.
- **Auth → Notification**: send the signup OTP email.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full database design and data flow.

---

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion, React Router, React Hook Form, Axios, Recharts, react-hot-toast, SweetAlert2, lucide-react |
| Backend | Node.js, Express, Sequelize, PostgreSQL, JWT, bcrypt, Nodemailer, Winston, Morgan |
| Gateway | Express + http-proxy-middleware |
| Security | Helmet, CORS, express-rate-limit, xss, express-validator |
| Docs | Swagger (swagger-jsdoc + swagger-ui-express) |

---

## 🚀 Getting Started (Node + local PostgreSQL)

**Prerequisites:** Node 18+, and your local **PostgreSQL** running with a database named `parking_db`.

Create the database (pick whichever you use):

```sql
-- in pgAdmin (Query Tool) or psql
CREATE DATABASE parking_db;
```
> pgAdmin: right-click **Databases → Create → Database…**, name it `parking_db`.

Note your Postgres **username** and **password** — you'll put them in the `.env` files next (default in the examples is `postgres` / `postgres`).

The backend and frontend are **separate projects** — set each up in its own folder.

**Backend** (`backend/` — 7 microservices):
```bash
cd backend

# 1. Create every service .env from .env.example
npm run setup:env
#    → then edit DB_USER / DB_PASSWORD in each service .env if needed
#    (all services MUST share the same JWT_SECRET and DB connection)

# 2. Install root tooling + all services
npm install
npm run install:all

# 3. Seed sample data (admin/attendant users + parkings)
npm run seed

# 4. Run all 7 services — each in its OWN terminal window
npm run dev
```

**Frontend** (`frontend/` — React + Vite), in a separate terminal:
```bash
cd frontend
cp .env.example .env   # VITE_API_URL defaults to the gateway at http://localhost:4000
npm install
npm run dev
```

- **Frontend:** http://localhost:5173
- **Gateway:** http://localhost:4000

### Backend run options (from `backend/`)

| Command | What it does |
|---|---|
| `npm run dev` | Opens **7 separate terminals**, one per backend service |
| `npm run dev:mux` | All 7 in **one** terminal, color-coded (concurrently mode) |
| `npm run dev:auth` (etc.) | Run a single service inline (`dev:gateway`, `dev:user`, `dev:parking`, `dev:carentry`, `dev:report`, `dev:notification`) |

> **Typical split:** run the backend (`backend/ → npm run dev`) in one place and the frontend (`frontend/ → npm run dev`) in another, so backend logs and the Vite dev server stay separate.
>
> The separate-terminals launcher (`backend/scripts/start-backend.bat`) is Windows-only. On macOS/Linux use `npm run dev:mux`, or open tabs and run the individual `dev:*` scripts.

---

## 🔑 Demo Accounts (after seeding)

| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@xwz.rw` | `Admin123!` |
| **Attendant** | `attendant@xwz.rw` | `Attend123!` |

You can also **sign up** a brand-new account — a 6-digit OTP is sent by email.
**No SMTP configured?** The OTP is printed to the **notification-service console** _and_ returned in the signup response as `devOtp` (dev only), and shown as a toast in the UI.

---

## 📧 Email / OTP setup (optional)

Edit `backend/services/notification-service/.env`:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your_gmail_app_password   # https://myaccount.google.com/apppasswords
```

Leave `SMTP_USER`/`SMTP_PASS` blank to run in **console mode** (OTPs logged, no real email needed).

---

## 📚 API Documentation (Swagger)

Each service self-documents:

| Service | Docs URL |
|---|---|
| Auth | http://localhost:4001/docs |
| User | http://localhost:4002/docs |
| Parking | http://localhost:4003/docs |
| Car-Entry | http://localhost:4004/docs |
| Report | http://localhost:4005/docs |
| Notification | http://localhost:4006/docs |

All routes are also reachable through the gateway at `http://localhost:4000/api/...`.

### Key endpoints

```
POST   /api/auth/signup            Register + send OTP
POST   /api/auth/verify-otp        Activate account
POST   /api/auth/login             Get JWT
GET    /api/auth/me                Current user

GET    /api/users                  List users (paginated, admin)
POST   /api/users                  Create user (admin)
PUT    /api/users/:id              Update user (admin)
DELETE /api/users/:id              Delete user (admin)

GET    /api/parkings               List (paginated)  — admin + attendant
POST   /api/parkings               Register parking (admin)
PUT    /api/parkings/:id           Edit (admin)
DELETE /api/parkings/:id           Delete (admin)

GET    /api/car-entries            List (paginated, filters)
POST   /api/car-entries            Register entry → ticket (admin)
PATCH  /api/car-entries/:id/exit   Register exit → bill (admin)

GET    /api/reports/outgoing?from=&to=   Outgoing cars + total charged (admin)
GET    /api/reports/incoming?from=&to=   Entered cars (admin)
GET    /api/reports/summary              KPIs (admin)
GET    /api/reports/revenue?from=&to=    Revenue per day (admin)
GET    /api/reports/occupancy            Occupancy per lot (admin)
```

---

## 🧪 Feature → Requirement map (XWZ assignment)

| Task | Where |
|---|---|
| DB model & system architecture | `docs/ARCHITECTURE.md` |
| Signup mockup → implementation | `frontend/src/pages/auth/Signup.jsx` |
| Roles (admin, attendant) | `User.role` + `RoleRoute` + `authorize()` |
| JWT auth + login after signup | auth-service |
| Register/view parkings, spaces, fees | parking-service + `Parkings.jsx` |
| Car entry/exit, ticket, bill, vacant-space update | car-entry-service ↔ parking-service |
| Reports between two dates + total charged | report-service + `Reports.jsx` |
| Swagger docs | `/docs` on every service |
| Pagination | every list endpoint + `DataTable`/`Pagination` |
| Logs | `backend/services/*/logs/*.log` (Winston) |
| Validation & exceptions | `validate.js` + `errorHandler.js` |
| CORS & web-security | Helmet, CORS, rate-limit, xss, bcrypt |
| Responsive, good-looking UI | the entire `frontend/` |

---

## 📁 Project Structure

```
Restful/
├── docs/ARCHITECTURE.md
├── backend/                     # backend project (microservices)
│   ├── package.json             # backend scripts (concurrently)
│   ├── .env.example             # shared env reference
│   ├── scripts/setup-env.mjs
│   └── services/
│       ├── api-gateway/         # :4000  routes to all services
│       ├── auth-service/        # :4001  signup, OTP, login, JWT
│       ├── user-service/        # :4002  admin user management
│       ├── parking-service/     # :4003  parking CRUD + occupancy
│       ├── car-entry-service/   # :4004  entry/exit, tickets, bills
│       ├── report-service/      # :4005  reports & analytics
│       └── notification-service/ # :4006  OTP / email (nodemailer)
└── frontend/                    # :5173  React + Vite premium dashboard (own package.json)
```

Each service follows the same clean layout:
```
src/
├── config/      db.js, logger.js
├── middleware/  auth, validate, sanitize, rateLimiter, errorHandler
├── models/      Sequelize models
├── controllers/ business logic
├── routes/      REST routes + Swagger JSDoc
├── docs/        swagger.js
├── utils/       response envelope, jwt, ...
├── app.js       express app
└── server.js    bootstrap + db sync
```

---

## 🔒 Security checklist

- ✅ Passwords hashed with **bcrypt** (10 rounds)
- ✅ **JWT** signed with shared secret, expiry enforced, verified at gateway & services
- ✅ **Helmet** secure headers + **CORS** locked to the frontend origin
- ✅ **Rate limiting** (edge + per-service, stricter on auth routes)
- ✅ **XSS** sanitization of all request input
- ✅ **express-validator** input validation (email, password strength, etc.)
- ✅ **SQL injection** prevented by Sequelize parameterized queries
- ✅ OTP codes generated with `crypto.randomInt`, expire in 10 minutes

---

## 📝 Notes

- Built for the XWZ LTD upgrade brief (`RESTFUL.pdf`).
- Default `JWT_SECRET` is for development — **change it in production** and keep it identical across all services.

© XWZ LTD — Kigali, Rwanda.
