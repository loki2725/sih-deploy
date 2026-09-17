import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Brain } from "lucide-react";
import { T } from "@/models/constant.js";
import { Button, Card } from "@/views/components/common/Primitive.jsx";
import { accountController } from "@/controllers/accountController.js";

export function PasswordReset() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const requestReset = async (e) => {
    e.preventDefault();
    setLoading(true); setError(""); setMessage("");
    try {
      const data = await accountController.requestPasswordReset(email);
      setMessage(data.message);
      setStep(2);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError(""); setMessage("");
    if (otp.length !== 6) return setError("Enter the 6-digit OTP");
    if (newPassword.length < 8) return setError("Password must be at least 8 characters long");
    if (newPassword !== confirmPassword) return setError("Passwords do not match");

    setLoading(true);
    try {
      const data = await accountController.resetPassword({ email, otp, newPassword });
      setMessage(data.message);
      setStep(3);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: T.canvas }}>
      <Card className="w-full max-w-md px-8 py-10 shadow-2xl border-0" style={{ background: T.surface }}>
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-sm mb-8 cursor-pointer" style={{ color: T.inkSoft }}>
          <ArrowLeft size={16} /> Back to sign in
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: T.primarySoft }}>
            <Brain size={20} color={T.primary} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold" style={{ color: T.primaryDark }}>Reset password</h1>
            <p className="text-xs" style={{ color: T.inkSoft }}>Step {Math.min(step, 2)} of 2</p>
          </div>
        </div>

        {error && <div className="p-3 rounded-xl text-sm mb-4" style={{ background: T.surface, border: `1px solid ${T.red}`, color: T.red }}>{error}</div>}
        {message && <div className="p-3 rounded-xl text-sm mb-4" style={{ background: T.primarySoft, border: `1px solid ${T.line}`, color: T.primaryDark }}>{message}</div>}

        {step === 1 && (
          <form onSubmit={requestReset} className="flex flex-col gap-4">
            <p className="text-sm" style={{ color: T.inkSoft }}>Enter the email associated with your NeuroNest account. We'll send a 6-digit reset code.</p>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full p-3 rounded-xl outline-none" style={{ border: `1px solid ${T.line}`, background: T.surface, color: T.ink }} />
            <Button disabled={loading} className="w-full py-3.5">{loading ? "Sending code..." : "Send reset code"}</Button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={resetPassword} className="flex flex-col gap-4">
            <p className="text-sm" style={{ color: T.inkSoft }}>Enter the code sent to <strong>{email}</strong>, then choose a new password.</p>
            <input inputMode="numeric" maxLength={6} required value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit OTP" className="w-full p-3 rounded-xl outline-none tracking-[0.4em] text-center font-bold" style={{ border: `1px solid ${T.line}`, background: T.surface, color: T.ink }} />
            <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password (8+ characters)" className="w-full p-3 rounded-xl outline-none" style={{ border: `1px solid ${T.line}`, background: T.surface, color: T.ink }} />
            <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="w-full p-3 rounded-xl outline-none" style={{ border: `1px solid ${T.line}`, background: T.surface, color: T.ink }} />
            <Button disabled={loading} className="w-full py-3.5">{loading ? "Resetting..." : "Reset password"}</Button>
            <button type="button" onClick={() => setStep(1)} className="text-xs cursor-pointer" style={{ color: T.inkSoft }}>Use a different email</button>
          </form>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm" style={{ color: T.inkSoft }}>Your password has been changed. All previous login sessions have been invalidated.</p>
            <Button onClick={() => navigate("/")} className="w-full py-3.5">Back to sign in</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
