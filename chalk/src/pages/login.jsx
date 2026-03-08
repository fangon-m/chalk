import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";
import logo from "../../res/logo.png";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [errors, setErrors] = useState({});

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", password: "", confirm: "" });

  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const validate = (form, isRegister) => {
    const e = {};
    if (!form.email) e.email = "email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "invalid email format";
    if (!form.password) e.password = "password is required";
    else if (form.password.length < 6) e.password = "minimum 6 characters";
    if (isRegister) {
      if (!form.name) e.name = "name is required";
      if (form.password !== form.confirm) e.confirm = "passwords don't match";
    }
    return e;
  };

  const handleLogin = async () => {
    const e = validate(loginForm, false);
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginForm.email,
      password: loginForm.password,
    });
    setLoading(false);
    if (error) {
      showToast("✗ " + error.message);
    } else {
      navigate("/dashboard");
    }
  };

  const handleRegister = async () => {
    const e = validate(registerForm, true);
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: registerForm.email,
      password: registerForm.password,
      options: {
        data: { full_name: registerForm.name }
      }
    });
    setLoading(false);
    if (error) {
      showToast("✗ " + error.message);
    } else {
      showToast("✓ check your email to verify your account!");
    }
  };

  return (
    <div style={{ minHeight: "100vh", width: "100vw", position: "fixed", top: 0, left: 0 }}
      className="bg-[#0d0d0d] text-[#f0f0e8] flex items-center justify-center overflow-hidden font-mono">

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Mono:wght@300;400;500&display=swap');
        .font-serif-display { font-family: 'DM Serif Display', serif; }
        .font-mono-dm { font-family: 'DM Mono', monospace; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes toastIn {
          from { opacity: 0; top: 12px; }
          to   { opacity: 1; top: 24px; }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .animate-fadeUp { animation: fadeUp 0.6s ease both; }
        .animate-spin-fast { animation: spin 0.6s linear infinite; }
        .animate-toast { animation: toastIn 0.3s ease both; }
        .animate-pulse-dot { animation: pulse-dot 2s ease infinite; }
        .tab-active { background: #141414; color: #c8f04c; border: 1px solid #232323; }
        .tab-inactive { color: #666; }
        .input-base {
          width: 100%; background: #0d0d0d; border: 1px solid #232323;
          border-radius: 8px; padding: 11px 14px;
          font-family: 'DM Mono', monospace; font-size: 13px;
          color: #f0f0e8; outline: none;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .input-base:focus { border-color: #c8f04c; box-shadow: 0 0 0 3px rgba(200,240,76,0.08); }
        .input-error { border-color: #ff6b6b !important; }
        .btn-social:hover { border-color: #c8f04c !important; color: #c8f04c !important; }
        body { margin: 0 !important; padding: 0 !important; }
      `}</style>

      {/* Grid background */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{
        backgroundImage: "linear-gradient(rgba(200,240,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(200,240,76,0.03) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      {/* Glow orbs */}
      <div className="fixed rounded-full pointer-events-none z-0" style={{ width: 400, height: 400, background: "rgba(200,240,76,0.06)", filter: "blur(80px)", top: -100, left: -100 }} />
      <div className="fixed rounded-full pointer-events-none z-0" style={{ width: 300, height: 300, background: "rgba(200,240,76,0.04)", filter: "blur(80px)", bottom: -80, right: -80 }} />

      {/* Toast */}
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 z-50 animate-toast font-mono-dm"
          style={{ top: 24, background: "#141414", border: "1px solid #c8f04c", borderRadius: 8, padding: "12px 20px", fontSize: 12, letterSpacing: "0.06em", color: "#c8f04c", whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}

      {/* Main wrapper */}
      <div className="relative z-10 w-full max-w-105 px-6 animate-fadeUp">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <img src={logo} alt="logo" className="w-8 h-8 border border-[#ffffff21] rounded-md object-cover" />
          <span className="font-mono-dm text-white" style={{ fontSize: 12, letterSpacing: "5px", textTransform: "uppercase" }}>CHALK</span>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-9" style={{ background: "#141414", border: "1px solid #232323" }}>

          {/* Tabs */}
          <div className="flex rounded-lg p-0.75 mb-8" style={{ background: "#0d0d0d" }}>
            {["login", "register"].map((t) => (
              <button key={t} onClick={() => { setTab(t); setErrors({}); }}
                className={`flex-1 py-2 rounded-md font-mono-dm cursor-pointer transition-all duration-200 border-0 ${tab === t ? "tab-active" : "tab-inactive"}`}
                style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {t === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {/* ───── LOGIN FORM ───── */}
          {tab === "login" ? (
            <>
              <div className="font-serif-display mb-1" style={{ fontSize: 26, lineHeight: 1.2 }}>
                Welcome <em style={{ fontStyle: "italic", color: "#c8f04c" }}>back.</em>
              </div>
              <div className="mb-7 text-[#666]" style={{ fontSize: 11, letterSpacing: "0.05em" }}>your board is waiting.</div>

              {/* Email */}
              <div className="mb-4">
                <label className="block text-[#666] mb-2" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" }}>Email</label>
                <input type="email" placeholder="you@example.com"
                  className={`input-base ${errors.email ? "input-error" : ""}`}
                  value={loginForm.email}
                  onChange={(e) => setLoginForm((p) => ({ ...p, email: e.target.value }))} />
                {errors.email && <p className="mt-1 text-[#ff6b6b]" style={{ fontSize: 10 }}>⚠ {errors.email}</p>}
              </div>

              {/* Password */}
              <div className="mb-2">
                <label className="block text-[#666] mb-2" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" }}>Password</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} placeholder="••••••••"
                    className={`input-base ${errors.password ? "input-error" : ""}`}
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    style={{ paddingRight: "40px" }} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[#666] hover:text-[#c8f04c] transition-colors duration-200"
                    onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </span>
                </div>
                {errors.password && <p className="mt-1 text-[#ff6b6b]" style={{ fontSize: 10 }}>⚠ {errors.password}</p>}
              </div>

              {/* Forgot password */}
              <span className="block text-right text-[#666] mb-6 cursor-pointer hover:text-[#c8f04c] transition-colors duration-200"
                style={{ fontSize: 10, letterSpacing: "0.08em" }}
                onClick={() => showToast("reset link sent to your email")}>
                forgot password?
              </span>

              {/* Login button */}
              <button onClick={handleLogin} disabled={loading}
                className="w-full py-3 rounded-lg font-mono-dm font-medium cursor-pointer transition-all duration-200 hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "#c8f04c", color: "#0d0d0d", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", border: "none" }}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full animate-spin-fast" style={{ border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#0d0d0d" }} />
                    authenticating...
                  </span>
                ) : "Enter Board →"}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: "#232323" }} />
                <span className="text-[#666]" style={{ fontSize: 10, letterSpacing: "0.1em" }}>or continue with</span>
                <div className="flex-1 h-px" style={{ background: "#232323" }} />
              </div>

              {/* Social buttons */}
              <div className="flex gap-3">
                {[
                  { label: "Google", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> },
                  { label: "GitHub", icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg> }
                ].map(({ label, icon }) => (
                  <button key={label} className="btn-social flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-mono-dm cursor-pointer transition-all duration-200"
                    style={{ background: "transparent", border: "1px solid #232323", color: "#666", fontSize: 11, letterSpacing: "0.06em" }}
                    onClick={() => showToast(`${label} OAuth coming soon`)}>
                    {icon} {label}
                  </button>
                ))}
              </div>
            </>

          ) : (

            /* ───── REGISTER FORM ───── */
            <>
              <div className="font-serif-display mb-1" style={{ fontSize: 26, lineHeight: 1.2 }}>
                Build your <em style={{ fontStyle: "italic", color: "#c8f04c" }}>Board.</em>
              </div>
              <div className="mb-7 text-[#666]" style={{ fontSize: 11, letterSpacing: "0.05em" }}>one system for your entire life.</div>

              {/* Full Name */}
              <div className="mb-4">
                <label className="block text-[#666] mb-2" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" }}>Full Name</label>
                <input type="text" placeholder="Your Name"
                  className={`input-base ${errors.name ? "input-error" : ""}`}
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, name: e.target.value }))} />
                {errors.name && <p className="mt-1 text-[#ff6b6b]" style={{ fontSize: 10 }}>⚠ {errors.name}</p>}
              </div>

              {/* Email */}
              <div className="mb-4">
                <label className="block text-[#666] mb-2" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" }}>Email</label>
                <input type="email" placeholder="you@example.com"
                  className={`input-base ${errors.email ? "input-error" : ""}`}
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))} />
                {errors.email && <p className="mt-1 text-[#ff6b6b]" style={{ fontSize: 10 }}>⚠ {errors.email}</p>}
              </div>

              {/* Password */}
              <div className="mb-4">
                <label className="block text-[#666] mb-2" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" }}>Password</label>
                <div className="relative">
                  <input type={showRegisterPassword ? "text" : "password"} placeholder="••••••••"
                    className={`input-base ${errors.password ? "input-error" : ""}`}
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))}
                    style={{ paddingRight: "40px" }} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[#666] hover:text-[#c8f04c] transition-colors duration-200"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}>
                    {showRegisterPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </span>
                </div>
                {errors.password && <p className="mt-1 text-[#ff6b6b]" style={{ fontSize: 10 }}>⚠ {errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div className="mb-4">
                <label className="block text-[#666] mb-2" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" }}>Confirm Password</label>
                <div className="relative">
                  <input type={showConfirmPassword ? "text" : "password"} placeholder="••••••••"
                    className={`input-base ${errors.confirm ? "input-error" : ""}`}
                    value={registerForm.confirm}
                    onChange={(e) => setRegisterForm((p) => ({ ...p, confirm: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                    style={{ paddingRight: "40px" }} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[#666] hover:text-[#c8f04c] transition-colors duration-200"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </span>
                </div>
                {errors.confirm && <p className="mt-1 text-[#ff6b6b]" style={{ fontSize: 10 }}>⚠ {errors.confirm}</p>}
              </div>

              {/* Register button */}
              <button onClick={handleRegister} disabled={loading}
                className="w-full py-3 mt-2 rounded-lg font-mono-dm font-medium cursor-pointer transition-all duration-200 hover:opacity-90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "#c8f04c", color: "#0d0d0d", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", border: "none" }}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full animate-spin-fast" style={{ border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#0d0d0d" }} />
                    creating account...
                  </span>
                ) : "Initialize System →"}
              </button>
            </>
          )}
        </div>

        {/* Status bar */}
        <div className="flex justify-between mt-5 text-[#666] font-mono-dm" style={{ fontSize: 10, letterSpacing: "0.06em" }}>
          <span className="flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "#c8f04c" }} />
            system online
          </span>
          <span>v0.1.0 — alpha</span>
        </div>
      </div>
    </div>
  );
}