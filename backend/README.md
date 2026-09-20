# NeuroNest Backend

The NeuroNest backend provides the API, real-time chat server, database access, email notifications, record uploads, care-plan scheduling, and SOS workflows for the patient and doctor portals.

## What it supports

- Patient and doctor registration, email OTP verification, sign-in, password reset, and JWT sessions.
- Patient-doctor connections, diagnoses, medication plans, doctor reminders, and care history.
- Cognitive-game session history, appointment requests and scheduling, and medical records.
- Authenticated Socket.IO chat.
- Care reminders, doctor alerts, and privacy-aware SOS location sharing.

## Requirements

- Node.js 20.19 or newer
- MongoDB (Atlas or local)
- A Gmail account with an App Password for email features
- Cloudinary credentials for medical-record uploads

## Run locally

From the `backend` directory:

```bash
npm install
```

Copy `.env.example` to `.env` and replace the placeholder values. Start the development server:

```bash
npm run dev
```

The default address is `http://localhost:5001`. To run without Nodemon:

```bash
npm start
```

Check the service:

```bash
curl http://localhost:5001/api/health
```

Expected response:

```json
{ "message": "NeuroNest API is running smoothly!" }
```

## Environment configuration

Create `backend/.env`. Never commit it or share its values.

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | API and Socket.IO port; defaults to `5001`. |
| `MONGO_URI` | Yes | MongoDB connection string. |
| `JWT_SECRET` | Yes | Long, unique secret for login tokens. |
| `EMAIL_USER` | For email | Gmail address that sends OTP, appointment, reminder, and SOS emails. |
| `EMAIL_PASS` | For email | Gmail App Password, never the normal account password. |
| `EMAIL_FROM` | No | Sender address; defaults to `EMAIL_USER`. |
| `EMAIL_HOST` | No | Generic SMTP hostname. If omitted, Gmail SMTP is used. |
| `EMAIL_PORT` | No | Generic SMTP port; commonly `587`. |
| `EMAIL_SECURE` | No | `true` for TLS-on-connect SMTP such as port `465`; otherwise `false`. |
| `EMAIL_SEND_TIMEOUT_MS` | No | Maximum time a single email send may wait; defaults to `12000`. |
| `EMAIL_CONNECTION_TIMEOUT_MS` | No | SMTP connection timeout; defaults to `8000`. |
| `EMAIL_GREETING_TIMEOUT_MS` | No | SMTP greeting timeout; defaults to `8000`. |
| `EMAIL_SOCKET_TIMEOUT_MS` | No | SMTP socket timeout; defaults to `10000`. |
| `CLOUDINARY_CLOUD_NAME` | For uploads | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | For uploads | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | For uploads | Cloudinary API secret. |
| `APP_TIMEZONE` | No | Time zone for daily care-plan checks; defaults to `Asia/Kolkata`. |
| `FRONTEND_URL` | Deployed frontend | Comma-separated browser origins allowed by CORS. |

Local Vite addresses `http://localhost:5173` and `http://localhost:5174` are already allowed. Add the deployed browser URL to `FRONTEND_URL` before deployment.

### Email troubleshooting

At startup, the server performs a non-blocking SMTP verification and logs either `Email transport verified successfully` or `Email transport is not ready: ...`. Email sends are bounded by a timeout so an unreachable SMTP server cannot hold an API request forever.

For Gmail, `EMAIL_USER` must be the sending Gmail address and `EMAIL_PASS` must be a Google App Password. Do not use the normal Gmail account password. For other SMTP providers, set `EMAIL_HOST`, `EMAIL_PORT`, and `EMAIL_SECURE` and keep `EMAIL_USER`/`EMAIL_PASS` as the SMTP credentials.

Signup, OTP resend, and password-reset delivery failures are surfaced to the browser instead of being reported as successful sends.

## API overview

All endpoints start with `/api`. Protected endpoints need:

```http
Authorization: Bearer <jwt>
```

| Area | Base path | Capabilities |
| --- | --- | --- |
| Health | `/api/health` | Service status check. |
| Authentication | `/api/auth` | Register, verify/resend OTP, login, reset password, account access/deletion. |
| Patient | `/api/patient` | Doctor connections, emergency details, care-item completion. |
| Doctor | `/api/doctor` | Patient management, diagnoses, medications, reminders, alerts, care history. |
| Games | `/api/games` | Game-session logging and history. |
| Appointments | `/api/appointments` | Requests, scheduling, declines, cancellation. |
| Records | `/api/records` | Upload, list, and secure download of records. |
| Chat | `/api/chat` | Conversation creation and message history. |
| SOS | `/api/sos` | Patient SOS alerts and doctor OTP confirmation. |

The `routes/` folder is the source of truth for exact methods, payloads, and role restrictions. Patient-only and doctor-only endpoints return `403` for the wrong account role.

## Background jobs and SOS privacy

When the server starts, it starts two background processes:

- The care worker checks every minute. At the next local midnight, it archives the previous day's care plan: completed items become **completed** and unfinished items become **missed**. Today's prescriptions remain in the active plan; archived entries appear in care history.
- The SOS retention job removes stored latitude, longitude, and accuracy seven days after a location is recorded or revealed.

An SOS starts with a patient location. The patient receives an email confirmation, while a linked doctor receives a six-digit OTP. Once that doctor verifies the code, the coordinates are sent to the doctor's registered email; the API does not return them. The patient is notified after the location is accessed.

## Real-time chat

Socket.IO runs on the same port as the API. Clients connect using a valid JWT, join a permitted conversation with `join_room`, and send a message with `send_message`. The server verifies that every participant belongs to the conversation.

## Project layout

```text
backend/
├── app.js          # Express middleware and API route mounting
├── server.js       # HTTP server, Socket.IO, database, and background jobs
├── config/         # MongoDB, Cloudinary, and upload configuration
├── controllers/    # Request and business logic
├── middleware/     # Authentication, role checks, and error handling
├── models/         # MongoDB schemas
├── routes/         # Endpoint definitions
├── services/       # Care scheduling, history, and SOS retention
├── sockets/        # Chat events
└── utils/          # Email, OTP, JWT, and authorization helpers
```

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start with Nodemon and restart on changes. |
| `npm start` | Start with Node.js. |

## Notes for deployment

- Set `FRONTEND_URL` to the deployed frontend origin; keep only trusted origins in the CORS list.
- Cloudinary is optional only when medical-record upload is unused. The server warns if its credentials are missing.
- Email-dependent flows, including account verification and SOS confirmation, require valid Gmail SMTP settings.

### Test email delivery locally

After creating `backend/.env`, run:

```bash
npm run email:test
```

Optionally set `EMAIL_TEST_TO` to a different inbox. The command verifies SMTP and sends a test six-digit code. If it fails, the terminal error identifies whether the issue is missing credentials, SMTP authentication, connectivity, or a timeout.
