# NeuroNest Frontend

The NeuroNest frontend is the React web application for patients and doctors using NeuroNest. It provides authentication, role-specific dashboards, patient care and safety tools, cognitive games, medical records, appointment workflows, and real-time messaging.

## Technology

- React 19
- Vite 8
- React Router
- Tailwind CSS 4
- Socket.IO Client
- Recharts and Lucide React

## Prerequisites

- Node.js 18 or later
- The [NeuroNest backend](../backend/README.md) running locally or deployed

## Installation and startup

From this directory:

```bash
npm install
```

Optionally create a `.env` file to point the app at a non-default API:

```env
VITE_API_URL=http://localhost:5001
```

Then start the development server:

```bash
npm run dev
```

Vite will display the local URL in the terminal (normally `http://localhost:5173`). With no `VITE_API_URL`, the client uses `http://localhost:5001`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Create a production build in `dist/`. |
| `npm run preview` | Preview the production build locally. |
| `npm run lint` | Run ESLint across the project. |

Before submitting a change, run:

```bash
npm run lint
npm run build
```

## Features

### Patient experience

- Registration, OTP verification, sign-in, password reset, and account settings.
- Doctor linking, profile/onboarding, and emergency contact/location details.
- Safety hub with SOS assistance.
- Cognitive games: sequence, color memory, sound sequence, number order, and odd-one-out.
- Game history, medical-record uploads, medication completion, and doctor reminders.
- Appointment requests and real-time conversations with a linked doctor.

### Doctor experience

- Dashboard and linked-patient views.
- Patient linking/acceptance, diagnoses, care history, medications, and reminders.
- Care alerts and configurable care notifications.
- Appointment scheduling and record access.
- SOS alert review and real-time chat.

## Application routes

| Route | Purpose |
| --- | --- |
| `/` | Authentication and role selection. |
| `/reset-password` | Password recovery flow. |
| `/patient/safety` | Default patient safety hub. |
| `/patient/onboarding` | Patient onboarding. |
| `/patient/games` | Game selection and play flow. |
| `/patient/history` | Patient game history. |
| `/patient/records` | Patient medical records. |
| `/patient/profile` | Patient profile and care information. |
| `/doctor/dashboard` | Default doctor dashboard. |
| `/doctor/patients` | Doctor patient list/detail workflow. |
| `/doctor/records` | Doctor medical-record access. |
| `/doctor/appointments` | Doctor appointment management. |

## Backend connection and authentication

`src/models/apiModel.js` defines the API base URL, and `src/services/apiClient.js` attaches the saved JWT as a Bearer token for API calls. `src/services/socketClient.js` connects Socket.IO to the same base URL.

For local development, start the backend at port `5001` before using API-backed screens. The backend only accepts browser origins on ports `5173` and `5174` by default; adjust its CORS configuration if Vite starts on a different port or if you deploy the frontend.

## Project structure

```text
frontend/
├── public/             # Static favicons and icons
├── src/
│   ├── assets/         # Images and other bundled assets
│   ├── controllers/    # UI state and feature actions
│   ├── models/         # API URL, storage, constants, and mock data
│   ├── routes/         # Application route tree
│   ├── services/       # API and Socket.IO clients
│   ├── views/
│   │   ├── components/ # Reusable UI components
│   │   ├── layouts/    # Patient and doctor application shells
│   │   └── pages/      # Authentication, patient, doctor, and game screens
│   ├── App.jsx         # Router entry point
│   └── main.jsx        # React bootstrap
├── vite.config.js      # Vite, React, Tailwind, and @ alias setup
└── package.json
```

The `@` import alias maps to `src`, for example `@/services/apiClient.js`.

## Environment and deployment notes

- Only variables beginning with `VITE_` are exposed to browser code. Do not place passwords, JWT secrets, database URLs, or email credentials in the frontend `.env` file.
- Set `VITE_API_URL` to the public HTTPS URL of the backend for production builds.
- Configure the backend CORS allowlist with the deployed frontend origin and make sure Socket.IO uses that same origin.
- Run `npm run build` and deploy the resulting `dist/` directory to a static host.

## A good frontend README should include

A helpful README explains the product, tools, setup steps, environment variables, scripts, main routes/features, project layout, and deployment expectations. It should be accurate, concise, safe with secrets, and updated alongside the code so that a new contributor can run the project without guesswork.
