import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Brain, Activity } from "lucide-react";
import { T } from "@/models/constant.js";
import { Button, Card } from "@/views/components/common/Primitive.jsx";

export function LoginScreen() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    age: "",
    condition: "",
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // OTP verification step
  const [pendingVerification, setPendingVerification] = useState(false);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [otpMessage, setOtpMessage] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const endpoint = isRegistering
      ? "http://localhost:5001/api/auth/register"
      : "http://localhost:5001/api/auth/login";

    const payload = isRegistering
      ? { ...formData, role: selectedRole }
      : { email: formData.email, password: formData.password };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        // Existing account that never verified -> send them straight to OTP entry
        if (data.needsVerification) {
          setPendingVerification(true);
          setError(null);
          setOtpMessage("This account isn't verified yet. Enter the code sent to your email, or resend a new one.");
          return;
        }
        throw new Error(
          data.error ||
            (isRegistering ? "Registration failed" : "Login failed"),
        );
      }

      if (isRegistering) {
        // Registered -> don't log in yet, show the OTP screen
        setPendingVerification(true);
        setOtpMessage(`We sent a 6-digit code to ${formData.email}. Enter it below to verify your account.`);
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.user.role === "doctor") {
        navigate("/doctor/dashboard");
      } else {
        // FIX: Redirect patients to their profile instead of dashboard
        navigate("/patient/profile");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpDigitChange = (index, value) => {
    if (!/^[0-9]?$/.test(value)) return; // digits only, one char
    const next = [...otpDigits];
    next[index] = value;
    setOtpDigits(next);

    if (value && index < 5) {
      document.getElementById(`otp-box-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      document.getElementById(`otp-box-${index - 1}`)?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    e.preventDefault();
    const next = pasted.split("");
    while (next.length < 6) next.push("");
    setOtpDigits(next);
    document.getElementById(`otp-box-${Math.min(pasted.length, 5)}`)?.focus();
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otp = otpDigits.join("");
    if (otp.length !== 6) {
      setError("Enter all 6 digits");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("http://localhost:5001/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, otp }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.user.role === "doctor") {
        navigate("/doctor/dashboard");
      } else {
        navigate("/patient/profile");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setOtpMessage(null);
    setLoading(true);
    try {
      const response = await fetch("http://localhost:5001/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Could not resend code");
      }
      setOtpDigits(["", "", "", "", "", ""]);
      setOtpMessage("A new code has been sent to your email.");
      setResendCooldown(30);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen grid lg:grid-cols-2"
      style={{ background: T.canvas }}
    >
      <div
        className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${T.primaryDark} 0%, ${T.primary} 100%)`,
        }}
      >
        <Brain
          className="absolute -bottom-24 -left-24 text-white opacity-10 transform -rotate-12"
          size={450}
        />
        <Activity
          className="absolute top-24 -right-12 text-white opacity-10"
          size={180}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-16">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md shadow-sm">
              <Brain size={22} color="#fff" />
            </div>
            <span className="text-white font-bold text-xl tracking-wide">
              NeuroNest
            </span>
          </div>

          <h1 className="text-5xl font-extrabold text-white mb-6 leading-tight tracking-tight">
            Elevating <br /> Cognitive Care.
          </h1>
          <p className="text-lg text-indigo-100 max-w-md leading-relaxed font-medium">
            A professional platform connecting patients and doctors for seamless
            memory tracking, structured rehabilitation, and trusted cognitive
            health monitoring.
          </p>
        </div>

        <div className="text-indigo-200 text-sm font-medium relative z-10">
          © {new Date().getFullYear()} NeuroNest Healthcare
        </div>
      </div>

      <div className="flex items-center justify-center p-6 relative">
        <div className="w-full max-w-md">
          <Card
            className="shadow-2xl border-0 px-8 py-10"
            style={{ background: T.surface }}
          >
            {pendingVerification ? (
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
                <div className="text-center mb-4">
                  <h2
                    className="text-2xl font-extrabold mb-1"
                    style={{ color: T.primaryDark }}
                  >
                    Verify your email
                  </h2>
                  <p className="text-xs" style={{ color: T.inkSoft }}>
                    {otpMessage || `Enter the 6-digit code sent to ${formData.email}`}
                  </p>
                </div>

                {error && (
                  <div
                    className="p-3 rounded-xl text-sm"
                    style={{
                      background: T.surface,
                      border: `1px solid ${T.red}`,
                      color: T.red,
                    }}
                  >
                    {error}
                  </div>
                )}

                <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-box-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="w-12 h-14 text-center text-xl font-bold rounded-xl outline-none"
                      style={{
                        border: `1px solid ${T.line}`,
                        background: T.surface,
                        color: T.ink,
                      }}
                    />
                  ))}
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 mt-2 text-base shadow-md transition-all cursor-pointer"
                >
                  {loading ? "Verifying..." : "Verify & Continue"}
                </Button>

                <div className="flex justify-between items-center mt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setPendingVerification(false);
                      setIsRegistering(false);
                      setOtpDigits(["", "", "", "", "", ""]);
                      setError(null);
                      setOtpMessage(null);
                    }}
                    className="cursor-pointer hover:underline"
                    style={{ color: T.inkSoft }}
                  >
                    ← Back to sign in
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || loading}
                    className="cursor-pointer font-semibold hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
                    style={{ color: T.primary }}
                  >
                    {resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code"}
                  </button>
                </div>
              </form>
            ) : !selectedRole ? (
              <>
                <div className="text-center mb-10">
                  <div
                    className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center shadow-inner"
                    style={{ background: T.primarySoft }}
                  >
                    <Brain size={32} color={T.primary} />
                  </div>
                  <h2 className="text-3xl font-extrabold mb-2 bg-gradient-to-br from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Welcome to NeuroNest
                  </h2>
                  <p
                    className="text-sm font-medium"
                    style={{ color: T.inkSoft }}
                  >
                    Select your portal to continue
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  <Button
                    onClick={() => setSelectedRole("patient")}
                    className="w-full py-4 text-base shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                  >
                    I am a Patient
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedRole("doctor")}
                    className="w-full py-4 text-base border-2 hover:bg-indigo-50/50 transition-all duration-200 cursor-pointer"
                  >
                    I am a Doctor
                  </Button>
                </div>
              </>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="text-center mb-6">
                  <h2
                    className="text-2xl font-extrabold capitalize mb-1"
                    style={{ color: T.primaryDark }}
                  >
                    {selectedRole} {isRegistering ? "Registration" : "Portal"}
                  </h2>
                  <p className="text-xs" style={{ color: T.inkSoft }}>
                    {isRegistering
                      ? "Create a new account to get started"
                      : "Enter your account credentials to sign in"}
                  </p>
                </div>

                {error && (
                  <div
                    className="p-3 rounded-xl text-sm"
                    style={{
                      background: T.surface,
                      border: `1px solid ${T.red}`,
                      color: T.red,
                    }}
                  >
                    {error}
                  </div>
                )}

                {isRegistering && (
                  <div>
                    <label
                      className="text-xs font-semibold"
                      style={{ color: T.inkSoft }}
                    >
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required={isRegistering}
                      className="w-full mt-1 p-3 rounded-xl outline-none"
                      style={{
                        border: `1px solid ${T.line}`,
                        background: T.surface,
                        color: T.ink,
                      }}
                    />
                  </div>
                )}

                {isRegistering && selectedRole === "patient" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        className="text-xs font-semibold"
                        style={{ color: T.inkSoft }}
                      >
                        Age
                      </label>
                      <input
                        type="number"
                        name="age"
                        value={formData.age}
                        onChange={handleChange}
                        placeholder="e.g. 65"
                        className="w-full mt-1 p-3 rounded-xl outline-none text-sm"
                        style={{
                          border: `1px solid ${T.line}`,
                          background: T.surface,
                          color: T.ink,
                        }}
                      />
                    </div>
                    <div>
                      <label
                        className="text-xs font-semibold"
                        style={{ color: T.inkSoft }}
                      >
                        Condition
                      </label>
                      <input
                        type="text"
                        name="condition"
                        value={formData.condition}
                        onChange={handleChange}
                        placeholder="e.g. Mild MCI"
                        className="w-full mt-1 p-3 rounded-xl outline-none text-sm"
                        style={{
                          border: `1px solid ${T.line}`,
                          background: T.surface,
                          color: T.ink,
                        }}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label
                    className="text-xs font-semibold"
                    style={{ color: T.inkSoft }}
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full mt-1 p-3 rounded-xl outline-none"
                    style={{
                      border: `1px solid ${T.line}`,
                      background: T.surface,
                      color: T.ink,
                    }}
                  />
                </div>

                <div>
                  <label
                    className="text-xs font-semibold"
                    style={{ color: T.inkSoft }}
                  >
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full mt-1 p-3 rounded-xl outline-none"
                    style={{
                      border: `1px solid ${T.line}`,
                      background: T.surface,
                      color: T.ink,
                    }}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 mt-2 text-base shadow-md transition-all cursor-pointer"
                >
                  {loading
                    ? isRegistering
                      ? "Creating Account..."
                      : "Authenticating..."
                    : isRegistering
                      ? "Sign Up"
                      : "Sign In"}
                </Button>

                <div className="flex justify-between items-center mt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRole(null);
                      setIsRegistering(false);
                      setError(null);
                    }}
                    className="cursor-pointer hover:underline"
                    style={{ color: T.inkSoft }}
                  >
                    ← Back to role selection
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsRegistering(!isRegistering);
                      setError(null);
                    }}
                    className="cursor-pointer font-semibold hover:underline"
                    style={{ color: T.primary }}
                  >
                    {isRegistering
                      ? "Already have an account? Sign In"
                      : "Need an account? Sign Up"}
                  </button>
                </div>
              </form>
            )}

            <div
              className="mt-10 pt-6 border-t text-center flex justify-center gap-4 text-xs font-semibold tracking-wide uppercase"
              style={{ borderColor: T.line, color: T.inkSoft }}
            >
              <span>Secure</span>
              <span>•</span>
              <span>Private</span>
              <span>•</span>
              <span>Trusted</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
