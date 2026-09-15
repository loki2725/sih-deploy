# NeuroNest Backend — MVC Structure

The backend is organized as a practical MVC-style Express application.

```text
backend/
├── app.js                    # Express app, middleware and API route mounting
├── server.js                 # HTTP server, Socket.IO and startup
│
├── config/
│   ├── db.js                 # MongoDB connection
│   ├── cloudinary.js         # Cloudinary configuration
│   └── multer.js             # Multer/temp-upload configuration
│
├── controllers/              # Business/request logic
│   ├── authController.js
│   ├── appointmentController.js
│   ├── chatController.js
│   ├── doctorController.js
│   ├── gameController.js
│   ├── patientController.js
│   ├── recordController.js
│   └── sosController.js
│
├── models/                   # MongoDB/Mongoose schemas
├── routes/                   # URL → middleware → controller mapping only
├── middleware/
│   ├── auth.js               # JWT authentication + role authorization
│   └── errorHandler.js       # Central error handling
├── sockets/
│   └── chatSocket.js         # Socket.IO chat events
└── utils/
    ├── authorization.js      # Shared ownership/link checks
    ├── generateOtp.js
    ├── jwt.js
    └── sendEmail.js
```

## Request flow

```text
Frontend
   ↓
Route
   ↓
Middleware (JWT / role / upload)
   ↓
Controller
   ↓
Model → MongoDB
   ↓
External service when needed (Cloudinary / Email)
   ↓
Response
```

`routes/` intentionally contains almost no business logic. The controller owns the request logic, while configuration and external-service setup live outside the controller.

The existing frontend API paths are preserved. The backend is therefore a structural refactor rather than a frontend rewrite.
