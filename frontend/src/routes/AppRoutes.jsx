import { useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";

import { PatientLayout } from "@/views/layouts/PatientLayout.jsx";
import { DoctorLayout } from "@/views/layouts/DoctorLayout.jsx";
import { LoginScreen } from "@/views/pages/auth/Login.jsx";
import { PasswordReset } from "@/views/pages/auth/PasswordReset.jsx";
import { AccountSettings } from "@/views/pages/AccountSettings.jsx";
import { Onboarding } from "@/views/pages/patient/Onboarding.jsx";
import { GameSelection } from "@/views/pages/patient/GameSelection.jsx";
import { SequenceGame } from "@/views/pages/patient/games/SequenceGame.jsx";
import { ColorMemoryGame } from "@/views/pages/patient/games/ColorMemoryGame.jsx";
import { SoundSequenceGame } from "@/views/pages/patient/games/SoundSequenceGame.jsx";
import { NumberOrderGame } from "@/views/pages/patient/games/NumberOrderGame.jsx";
import { OddOneOutGame } from "@/views/pages/patient/games/OddOneOutGame.jsx";
import { PostGameSummary } from "@/views/pages/patient/games/partials/PostGameSummary.jsx";
import { PatientHistory } from "@/views/pages/patient/PatientHistory.jsx";
import { PatientProfile } from "@/views/pages/patient/PatientProfile.jsx";
import { SafetyHub } from "@/views/pages/patient/SafetyHub.jsx";
import { PatientRecords } from "@/views/pages/patient/PatientRecords.jsx";
import { DoctorDashboard } from "@/views/pages/doctor/DoctorDashboard.jsx";
import { DoctorPatientDetail } from "@/views/pages/doctor/DoctorPatientDetail.jsx";
import { DoctorAppointments } from "@/views/pages/doctor/DoctorAppointments.jsx";
import { DoctorHealthRecords } from "@/views/pages/doctor/DoctorHealthRecords.jsx";
import { AddPatientModal } from "@/views/pages/doctor/modals/AddPatientModal.jsx";
import { authController } from "@/controllers/authController.js";
import { useGameController } from "@/controllers/gameController.js";

function GameFlowController({ game, result, onPlay, onFinish, onReset, navigate }) {
  if (!game) return <GameSelection onPlay={onPlay} />;
  if (game.key === "sound") return <SoundSequenceGame onBack={onReset} />;
  if (game.key === "color") return <ColorMemoryGame onBack={onReset} />;
  if (game.key === "numberOrder") return <NumberOrderGame onBack={onReset} />;
  if (game.key === "oddOneOut") return <OddOneOutGame onBack={onReset} />;
  if (game.key === "sequence" && !result) return <SequenceGame onBack={onReset} onFinish={onFinish} />;
  if (game.key === "sequence") {
    return (
      <PostGameSummary
        result={result}
        onBackHome={() => {
          onReset();
          navigate("/patient/safety");
        }}
      />
    );
  }
  return null;
}

export function AppRoutes() {
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState(authController.getInitialRole);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const game = useGameController();

  const currentTab =
    location.pathname.split("/")[2] ||
    (role === "patient" ? "safety" : "dashboard");

  const handleLogout = () => {
    authController.logout();
    setRole(null);
    navigate("/");
  };

  return (
    <Routes>
      <Route path="/reset-password" element={<PasswordReset />} />

      <Route
        path="/"
        element={
          !role ? (
            <LoginScreen
              onSelectRole={(nextRole) => {
                setRole(nextRole);
                navigate(nextRole === "patient" ? "/patient/safety" : "/doctor/dashboard");
              }}
            />
          ) : (
            <Navigate to={role === "patient" ? "/patient/safety" : "/doctor/dashboard"} replace />
          )
        }
      />

      <Route
        path="/patient/*"
        element={
          <PatientLayout
            active={currentTab}
            setActive={(key) => navigate(`/patient/${key}`)}
            onLogout={handleLogout}
          >
            <Routes>
              <Route path="/" element={<Navigate to="safety" replace />} />
              <Route path="onboarding" element={<Onboarding onDone={() => navigate("/patient/safety")} />} />
              <Route
                path="games"
                element={
                  <GameFlowController
                    game={game.activeGame}
                    result={game.gameResult}
                    onPlay={game.setActiveGame}
                    onFinish={game.setGameResult}
                    onReset={game.resetGame}
                    navigate={navigate}
                  />
                }
              />
              <Route path="history" element={<PatientHistory />} />
              <Route path="records" element={<PatientRecords />} />
              <Route path="settings" element={<AccountSettings onLogout={handleLogout} />} />
              <Route path="profile" element={<PatientProfile />} />
              <Route path="safety" element={<SafetyHub />} />
            </Routes>
          </PatientLayout>
        }
      />

      <Route
        path="/doctor/*"
        element={
          <DoctorLayout
            active={currentTab}
            setActive={(key) => {
              setSelectedPatient(null);
              navigate(`/doctor/${key}`);
            }}
            onLogout={handleLogout}
          >
            <Routes>
              <Route path="/" element={<Navigate to="dashboard" replace />} />
              <Route
                path="dashboard"
                element={
                  selectedPatient ? (
                    <DoctorPatientDetail patient={selectedPatient} onBack={() => setSelectedPatient(null)} />
                  ) : (
                    <DoctorDashboard onOpenPatient={setSelectedPatient} onAddPatient={() => setShowAddPatient(true)} />
                  )
                }
              />
              <Route
                path="patients"
                element={
                  selectedPatient ? (
                    <DoctorPatientDetail patient={selectedPatient} onBack={() => setSelectedPatient(null)} />
                  ) : (
                    <DoctorDashboard
                      patientsOnly
                      onOpenPatient={setSelectedPatient}
                    />
                  )
                }
              />
              <Route path="records" element={<DoctorHealthRecords />} />
              <Route path="appointments" element={<DoctorAppointments />} />
              <Route path="settings" element={<AccountSettings onLogout={handleLogout} />} />
            </Routes>
            {showAddPatient && (
              <AddPatientModal
                onClose={() => setShowAddPatient(false)}
                onConnected={() => setShowAddPatient(false)}
              />
            )}
          </DoctorLayout>
        }
      />
    </Routes>
  );
}
