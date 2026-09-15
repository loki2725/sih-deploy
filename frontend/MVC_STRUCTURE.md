# NeuroNest Frontend — MVC Structure

This React frontend uses an MVC-inspired architecture adapted to client-side applications.

```text
frontend/
└── src/
    ├── controllers/   # application state and user-flow logic
    ├── models/        # client-side data, storage and API configuration
    ├── routes/        # routing/navigation composition
    ├── services/      # API and Socket.IO infrastructure
    ├── views/         # React UI: pages, layouts and reusable components
    ├── assets/        # images/static assets
    ├── App.jsx        # application composition
    └── main.jsx       # React/Vite bootstrap
```

## Request flow

```text
User action
   ↓
View (React)
   ↓
Controller / Service
   ↓
Model / API
   ↓
Backend
   ↓
State update
   ↓
View
```

React is not classical server-side MVC, so the separation is adapted: Views own presentation, Controllers own application flow/state, Models own client-side data/configuration, and Services own infrastructure communication.

## Run

```bash
npm install
npm run dev
```

Set `VITE_API_URL` in `.env` if the backend is not running on `http://localhost:5001`.
