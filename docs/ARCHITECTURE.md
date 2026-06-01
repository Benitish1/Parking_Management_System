# XWZ Parking — Architecture & Database Design

This document covers **Task 1** of the brief: the database model, the system architecture, and the application data flow.

---

## 1. System Architecture

The system was migrated from a **monolith** to **microservices** so each capability can scale and deploy independently.

| Service | Port | Responsibility | Owns table(s) |
|---|---|---|---|
| API Gateway | 4000 | Single entry point, routing, edge rate-limit, CORS | — |
| Auth Service | 4001 | Signup, OTP verification, login, JWT issuing | `users` |
| User Service | 4002 | Admin user management (CRUD, stats) | `users` |
| Parking Service | 4003 | Parking CRUD, occupancy, occupy/release | `parkings` |
| Car-Entry Service | 4004 | Car entry/exit, tickets, bills, billing logic | `car_entries` |
| Report Service | 4005 | Reports & analytics (read-only) | reads `car_entries`, `parkings` |
| Notification Service | 4006 | OTP & transactional email (Nodemailer) | — |

**Communication**
- Frontend → **Gateway** → service (REST/JSON over HTTP).
- **Auth → Notification**: `POST /api/notifications/otp` to email the signup code.
- **Car-Entry → Parking**: `PATCH /parkings/code/:code/occupy` and `/release`, plus `GET /parkings/code/:code` to read the hourly fee — true service-to-service calls, with the caller's JWT forwarded.

**Persistence**
- A single PostgreSQL instance hosts the shared `parking_db`. Each service defines only the Sequelize models it needs and runs `sequelize.sync()` on boot. This keeps services independently deployable while avoiding heavy cross-service data duplication.

---

## 2. Database Model

### Entity-Relationship overview

```
┌─────────────────────────┐         ┌──────────────────────────┐
│         users           │         │        parkings          │
├─────────────────────────┤         ├──────────────────────────┤
│ id            UUID  PK   │         │ id              UUID  PK  │
│ firstName     string     │         │ code            string U  │◄──┐
│ lastName      string     │         │ parkingName     string    │   │
│ email         string  U  │         │ totalSpaces     int       │   │ parkingCode
│ password      string     │         │ availableSpaces int       │   │ (logical FK
│ role          enum       │         │ location        string    │   │  by code)
│ isVerified    bool       │         │ chargingFeePerHour decimal │   │
│ otpCode       string     │         │ createdAt / updatedAt     │   │
│ otpExpiresAt  date       │         └──────────────────────────┘   │
│ createdAt / updatedAt    │                                         │
└─────────────────────────┘         ┌──────────────────────────┐    │
                                     │       car_entries        │    │
   role ∈ { admin, attendant }       ├──────────────────────────┤    │
                                     │ id            UUID  PK    │    │
                                     │ plateNumber   string      │    │
                                     │ parkingCode   string ─────┼────┘
                                     │ entryDateTime date        │
                                     │ exitDateTime  date (null) │
                                     │ chargedAmount decimal (0) │
                                     │ durationMinutes int (null)│
                                     │ status        enum        │
                                     │ createdAt / updatedAt     │
                                     └──────────────────────────┘
                                       status ∈ { parked, exited }
```

> `parkings.code` is referenced by `car_entries.parkingCode` as a **logical foreign key**. Because the tables are owned by different services, the relationship is enforced at the application layer (the Car-Entry service validates the code against the Parking service) rather than with a hard DB constraint — a standard microservices trade-off.

### Tables

**users**
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| firstName, lastName | string | required |
| email | string | unique, lowercased |
| password | string | bcrypt hash |
| role | enum(`admin`,`attendant`) | default `attendant` |
| isVerified | boolean | default `false` |
| otpCode | string | nullable |
| otpExpiresAt | datetime | nullable |
| createdAt, updatedAt | datetime | |

**parkings**
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| code | string | unique, uppercase |
| parkingName | string | required |
| totalSpaces | integer | ≥ 1 |
| availableSpaces | integer | defaults to totalSpaces |
| location | string | required |
| chargingFeePerHour | decimal(10,2) | ≥ 0 |
| createdAt, updatedAt | datetime | |

**car_entries**
| Column | Type | Notes |
|---|---|---|
| id | UUID | PK |
| plateNumber | string | uppercase |
| parkingCode | string | logical FK → parkings.code |
| entryDateTime | datetime | default now |
| exitDateTime | datetime | **null until exit** |
| chargedAmount | decimal(10,2) | **0 until exit** |
| durationMinutes | integer | computed on exit |
| status | enum(`parked`,`exited`) | default `parked` |
| createdAt, updatedAt | datetime | |

---

## 3. Data Flow

### 3.1 Signup → OTP → Login
```
User → Frontend → Gateway → Auth Service
  Auth: create user (isVerified=false), generate 6-digit OTP (crypto), store + expiry
  Auth → Notification Service: send OTP email
User enters OTP → Auth verifies → isVerified=true
User logs in → Auth returns JWT → frontend stores token → role-based redirect
(OTP is required ONLY after signup, never on subsequent logins)
```

### 3.2 Car entry (ticket)
```
Admin → Car-Entry Service: POST /api/car-entries { plateNumber, parkingCode }
  Car-Entry → Parking Service: GET /parkings/code/:code  (verify exists + space free + fee)
  Car-Entry: create entry { entryDateTime=now, exitDateTime=null, chargedAmount=0, status=parked }
  Car-Entry → Parking Service: PATCH /parkings/code/:code/occupy  (availableSpaces--)
  ← returns a TICKET (plate, parking, entry time, fee/hr)
```

### 3.3 Car exit (bill)
```
Admin → Car-Entry Service: PATCH /api/car-entries/:id/exit
  Car-Entry: exitDateTime=now; durationMinutes = ceil((exit-entry)/60000)
  Car-Entry → Parking Service: GET fee; billableHours = max(1, ceil(minutes/60))
             chargedAmount = billableHours × chargingFeePerHour; status=exited
  Car-Entry → Parking Service: PATCH /parkings/code/:code/release  (availableSpaces++)
  ← returns a BILL (duration, billable hours, total amount)
```

### 3.4 Reporting
```
Admin → Report Service:
  /reports/outgoing?from&to  → exited cars in range + SUM(chargedAmount)
  /reports/incoming?from&to  → entered cars in range
  /reports/summary           → KPIs (revenue, parked, exited, spaces)
  /reports/revenue           → revenue grouped by day  (charts)
  /reports/occupancy         → occupancy per lot       (charts)
```

---

## 4. Frontend forms / pages

| Form / Page | Purpose |
|---|---|
| Signup (Figma mockup → React) | firstName, lastName, email, password, role |
| Login | email + password → JWT |
| Verify OTP | 6-digit code entry |
| Parkings | register / edit / delete / view parkings |
| Car Entries | register entry (ticket) & exit (bill) |
| Reports | incoming / outgoing between two dates |
| Analytics | revenue, occupancy, utilisation charts |
| Users | admin user management |

> The Figma mockup requirement (Task 1.3) targets the **signup form**, implemented pixel-faithfully in `frontend/src/pages/auth/Signup.jsx` (split-screen brand panel + validated form + role selector).
