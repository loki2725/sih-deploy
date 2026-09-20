# NeuroNest

NeuroNest is a full-stack cognitive-care platform that helps patients and doctors stay connected. It brings daily care plans, cognitive games, medical information, appointments, secure chat, and emergency support into two role-specific web portals.

## What the app does

Cognitive care can involve medication, reminders, exercises, appointments, records, safety planning, and regular contact with a doctor. NeuroNest keeps these activities together so patients have a clearer daily routine and doctors can better follow the care they provide.

```text
Patient or doctor signs up
        ↓
Email OTP verifies the account
        ↓
Patient and doctor connect
        ↓
Patient uses care, games, records, appointments, chat, and SOS tools
        ↓
Doctor reviews care, manages plans and appointments, and communicates securely
```

### Patient portal

- Creates an email-verified account and personal profile.
- Connects with a doctor through a request or patient connection code.
- Follows daily medication and doctor-reminder plans.
- Plays cognitive games and reviews activity history.
- Requests appointments, uploads/views medical records, and chats with a linked doctor.
- Keeps emergency details and can send an SOS alert with their location.

### Doctor portal

- Maintains a patient roster and connects with patients using a connection code or approval request.
- Reviews patient profiles, game activity, records, diagnoses, care alerts, and care history.
- Creates medications and reminders, and manages appointments.
- Chats with connected patients in real time.
- Handles SOS alerts using an email one-time password; verified coordinates are sent only to the doctor's registered email.

## Technology

| Layer | Tools |
| --- | --- |
| Frontend | React, Vite, Tailwind CSS, React Router, Recharts, Socket.IO Client |
| Backend | Node.js, Express, Socket.IO |
| Database | MongoDB with Mongoose |
| Security | JWT sessions, bcrypt passwords, email OTP verification |
| Services | Nodemailer/Gmail SMTP and Cloudinary |

## Quick start

You need Node.js 20.19+, MongoDB, a Gmail App Password for email features, and Cloudinary credentials if medical-record upload is required. NeuroNest also supports a generic SMTP server through `EMAIL_HOST`, `EMAIL_PORT`, and `EMAIL_SECURE`.

1. Start the backend:

   ```bash
   cd backend
   npm install
   ```

   Copy `.env.example` to `.env`, add your credentials, then run:

   ```bash
   npm run dev
   ```

2. Start the frontend in another terminal:

   ```bash
   cd frontend
   npm install
   ```

   Copy `.env.example` to `.env` and set:

   ```env
   VITE_API_URL=http://localhost:5001
   ```

   Then run:

   ```bash
   npm run dev
   ```

3. Open the address shown by Vite (normally `http://localhost:5173`), choose **Patient** or **Doctor**, create an account, and verify the code sent to your email.

### If OTP email does not arrive

The backend now verifies the SMTP transport at startup and bounds email sends with a timeout. Check the backend terminal for `Email transport verified successfully` or `Email transport is not ready: ...`.

For Gmail, use a Google **App Password**, not the normal Gmail password. If the App Password was copied with spaces, NeuroNest removes the spaces automatically. If Gmail SMTP is unavailable in your hosting environment, configure a transactional/generic SMTP provider with `EMAIL_HOST`, `EMAIL_PORT`, and `EMAIL_SECURE` instead.

Signup and password-reset flows never claim that an OTP was delivered when SMTP has failed. They return a clear error and allow the user to retry without waiting indefinitely.

## Important behavior

- The backend checks care plans continuously. In the configured time zone (default: `Asia/Kolkata`), completed items are archived as **completed** and unfinished items as **missed** at the next local midnight.
- Real-time chat requires a valid signed-in session and is limited to conversation participants.
- After a doctor confirms an SOS with their email OTP, the location is sent to that doctor's registered email, not returned to the web app. Stored SOS coordinates are redacted after seven days.
- Keep real `.env` files, database URLs, secrets, tokens, and Gmail App Passwords private.

## Repository layout

```text
NeuroNest-main/
├── frontend/   # React web application
├── backend/    # API, Socket.IO server, jobs, and database models
└── README.md   # Project overview
```

## Detailed guides

- [Frontend setup and portal guide](frontend/README.md)
- [Backend setup, API, and operations guide](backend/README.md)
