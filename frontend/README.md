# NeuroNest Frontend

This React application is the NeuroNest browser experience. It gives patients and doctors separate portals for cognitive care, communication, medical information, appointments, and safety support.

## What users can do

### Patient portal

Patients can create an account, verify their email, complete their profile, connect with a doctor, and then:

- Follow medication and doctor-reminder plans.
- Play cognitive games and review activity history.
- Add emergency contacts and send an SOS using the current location.
- Request appointments, upload/view medical records, and chat with a linked doctor.
- Update their profile and account settings.

### Doctor portal

Doctors can create a verified account and then:

- Connect with patients using a patient connection code or accept a request.
- Review patient details, game activity, medical records, diagnoses, and care history.
- Add medications and reminders, monitor care alerts, and manage care-notification settings.
- Schedule or decline appointments and chat with connected patients.
- Handle active SOS requests using the OTP sent to their registered email. Confirmed coordinates are delivered by email rather than shown in the app.

## Requirements

- Node.js 18 or newer
- A running NeuroNest backend; see [the backend README](../backend/README.md)

## Run locally

From the `frontend` directory:

```bash
npm install
```

Copy `.env.example` to `frontend/.env`, then point it to the backend:

```env
VITE_API_URL=http://localhost:5001
```

Start the development server:

```bash
npm run dev
```

Vite prints a local URL, normally `http://localhost:5173`. Open it in a browser and choose **Patient** or **Doctor** from the welcome screen.

## Environment variable

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Base URL of the running backend, without a trailing slash. It defaults to `http://localhost:5001` when omitted. |

For deployment, set `VITE_API_URL` to the public backend URL and add the frontend's public URL to the backend `FRONTEND_URL` variable.

## Sign-in flow

1. Select **Patient** or **Doctor**.
2. Sign up or sign in.
3. New accounts receive a six-digit verification code by email.
4. Enter the code to access the right portal.

The signed-in session is kept in browser storage. Sign out through account settings when using a shared device.

## Main routes

| Route | Purpose |
| --- | --- |
| `/` | Role selection and sign-in/sign-up. |
| `/reset-password` | Password reset flow. |
| `/patient/profile` | Patient profile after sign-in. |
| `/patient/safety` | Patient care and safety hub. |
| `/patient/games` | Cognitive-game selection and play. |
| `/patient/history` | Game and care history. |
| `/patient/records` | Patient medical records. |
| `/doctor/dashboard` | Doctor overview, care alerts, and SOS activity. |
| `/doctor/patients` | Doctor patient roster and patient detail view. |
| `/doctor/records` | Linked-patient records. |
| `/doctor/appointments` | Appointment management. |

## Project layout

```text
frontend/
├── public/             # Browser icons and static assets
└── src/
    ├── controllers/    # Authentication, care, account, and game flows
    ├── models/         # API URL, browser storage, and app-data helpers
    ├── routes/         # Client-side route composition
    ├── services/       # HTTP and Socket.IO helpers
    ├── views/          # Pages, layouts, games, and reusable components
    ├── App.jsx         # Router entry point
    └── main.jsx        # Vite/React bootstrap
```

The frontend uses React, Vite, Tailwind CSS, React Router, Recharts, Lucide icons, and Socket.IO Client. It communicates with the backend through the URL configured in `VITE_API_URL`.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Create a production build in `dist/`. |
| `npm run preview` | Preview the production build locally. |
| `npm run lint` | Run ESLint. |
