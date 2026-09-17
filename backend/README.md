# NeuroNest Backend

The NeuroNest backend is a REST API and Socket.IO server for a patient-care platform. It supports patient and doctor accounts, secure authentication, appointments, medical records, cognitive-game history, care reminders, emergency SOS workflows, and real-time chat.

## Technology

- Node.js with Express 5
- MongoDB with Mongoose
- JWT authentication and role-based authorization
- Socket.IO for chat
- Cloudinary and Multer for medical-record uploads
- Nodemailer (Gmail SMTP) for OTPs, appointments, SOS, and care-reminder emails

## Prerequisites

- Node.js 18 or later
- A MongoDB database (local or Atlas)
- A Gmail account with an app password for outbound email
- A Cloudinary account if record uploads are used

## Installation and startup

From this directory:

```bash
npm install
```

Create a `.env` file using the configuration below, then run:

```bash
npm run dev
```

The API starts on `http://localhost:5001` by default. Use `npm start` to run it without Nodemon.

Verify that the service and database connection are working:

```bash
curl http://localhost:5001/api/health
```

Expected response:

```json
{ "message": "NeuroNest API is running smoothly!" }
```

## Environment configuration

Create `backend/.env`. Never commit this file or real credentials.

```env
# Server and database
PORT=5001
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<database>
JWT_SECRET=replace-with-a-long-random-secret

# Gmail SMTP: use a Gmail App Password, not your regular password
EMAIL_USER=your-address@gmail.com
EMAIL_PASS=your-16-character-app-password

# Cloudinary (required for medical-record uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Optional: defaults to Asia/Kolkata
APP_TIMEZONE=Asia/Kolkata
```

`MONGO_URI` and `JWT_SECRET` are required to start the application. Cloudinary is warned about at startup when missing, but uploads will not work without it. Email features need the Gmail variables.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the server with automatic restart via Nodemon. |
| `npm start` | Start the server with Node.js. |

## API overview

All REST endpoints are prefixed with `/api`. Protected endpoints require:

```http
Authorization: Bearer <jwt>
```

| Area | Base path | Includes |
| --- | --- | --- |
| Health | `/api/health` | Service status check. |
| Authentication | `/api/auth` | Registration, OTP verification/resend, login, password reset, current user, account deletion. |
| Patient | `/api/patient` | Doctor discovery/link requests, emergency details, care-item completion. |
| Doctor | `/api/doctor` | Patient management, diagnoses, medication/reminder plans, care alerts/history. |
| Games | `/api/games` | Game-session logging and patient history. |
| Appointments | `/api/appointments` | Patient requests and doctor scheduling/declining. |
| Records | `/api/records` | Patient upload/list, doctor list, secure downloads. |
| Chat | `/api/chat` | Conversation creation and message history. |
| SOS | `/api/sos` | Patient alerts and doctor alert/OTP verification. |

The route files in `routes/` are the source of truth for exact HTTP methods and request payloads. The API distinguishes `patient` and `doctor` roles; role-restricted routes return `403` when accessed by the wrong account type.

## Real-time chat

Socket.IO shares the same port as the REST API. Clients join a conversation room with `join_room` and send messages through `send_message`; messages are delivered to room members through `receive_message`.

## Care reminder scheduler

The server starts a care check immediately and then every minute. It handles:

- Morning cognitive-game follow-up and doctor escalation for missed games.
- Medication and doctor-reminder follow-ups after their configured time.
- Email notifications and doctor care alerts.

The scheduler uses `APP_TIMEZONE` (default `Asia/Kolkata`). Ensure the server remains running for reminders to be processed.

## Project structure

```text
backend/
├── config/        # MongoDB, Cloudinary, and Multer configuration
├── controllers/   # Request handling and application logic
├── middleware/    # JWT/role checks and centralized error handling
├── models/        # Mongoose schemas
├── routes/        # REST endpoint definitions
├── services/      # Care history and reminder scheduling
├── sockets/       # Socket.IO chat events
├── utils/         # Email, JWT, OTP, authorization, and time helpers
├── app.js         # Express application and routes
└── server.js      # HTTP server, database connection, scheduler, Socket.IO
```

## Local development notes

- The current CORS allowlist accepts Vite development servers at `http://localhost:5173` and `http://localhost:5174`. Update `app.js` and `server.js` before deploying to another frontend origin.
- Temporary upload files are placed in `uploads/tmp`; uploaded medical records are intended for Cloudinary storage.
- Do not log, commit, or share JWTs, database URLs, SMTP passwords, or Cloudinary secrets.

## A good backend README should include

A useful README tells a new contributor what the service does, how to run it from a clean machine, required environment variables, available scripts, important endpoints, project structure, and deployment/security notes. Keep commands copy-pasteable and update the document whenever setup or API behavior changes.
