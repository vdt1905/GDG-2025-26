import { useState } from "react";
import useAuthStore, { authErrorMessage } from "../store/authStore";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
    Mail, Lock, User, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2,
    ArrowLeft, Activity, ShieldCheck, Microscope, FileText,
} from "lucide-react";
import React from "react";

const MODES = {
    signin: {
        title: "Welcome back",
        subtitle: "Sign in to continue to your patients.",
        submit: "Sign in",
    },
    signup: {
        title: "Create your account",
        subtitle: "Set up access for your clinic in under a minute.",
        submit: "Create account",
    },
    reset: {
        title: "Reset your password",
        subtitle: "We'll email you a link to choose a new one.",
        submit: "Send reset link",
    },
};

function Field({ id, label, icon: Icon, trailing, ...inputProps }) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="block text-sm font-medium text-slate-700">
                {label}
            </label>
            <div className="relative">
                <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                    id={id}
                    className={`w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 ${trailing ? "pr-12" : "pr-4"} text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10`}
                    {...inputProps}
                />
                {trailing}
            </div>
        </div>
    );
}

export default function Login() {
    const [mode, setMode] = useState("signin");
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [loading, setLoading] = useState(false);

    // Zustand selectors
    const currentUser = useAuthStore((state) => state.currentUser);
    const login = useAuthStore((state) => state.login);
    const signup = useAuthStore((state) => state.signup);
    const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
    const resetPassword = useAuthStore((state) => state.resetPassword);

    const navigate = useNavigate();
    const location = useLocation();
    // Where PrivateRoute bounced us from, so sign-in returns there.
    const redirectTo = location.state?.from?.pathname || "/dashboard";
    const signedOut = location.state?.signedOut;

    if (currentUser) {
        return <Navigate to={redirectTo} replace />;
    }

    const copy = MODES[mode];

    const switchMode = (next) => {
        setMode(next);
        setError("");
        setNotice("");
        setPassword("");
        setConfirmPassword("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setNotice("");

        if (mode === "signup") {
            if (!fullName.trim()) return setError("Enter your full name.");
            if (password.length < 6) return setError("Password must be at least 6 characters.");
            if (password !== confirmPassword) return setError("Passwords don't match.");
        }

        setLoading(true);
        try {
            if (mode === "signin") {
                await login(email, password);
                navigate(redirectTo, { replace: true });
            } else if (mode === "signup") {
                await signup(email, password, fullName.trim());
                navigate("/dashboard", { replace: true });
            } else {
                await resetPassword(email);
                // Same message whether or not the account exists, so the form
                // can't be used to discover which emails are registered.
                setNotice(`If an account exists for ${email}, a reset link is on its way. Check your inbox.`);
            }
        } catch (err) {
            if (mode === "reset" && err?.code === "auth/user-not-found") {
                setNotice(`If an account exists for ${email}, a reset link is on its way. Check your inbox.`);
            } else {
                setError(authErrorMessage(err));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setError("");
        setNotice("");
        setLoading(true);
        try {
            const result = await loginWithGoogle();
            // null => fell back to a full-page redirect; the browser is leaving.
            if (result) navigate(redirectTo, { replace: true });
        } catch (err) {
            setError(authErrorMessage(err));
        } finally {
            setLoading(false);
        }
    };

    const passwordToggle = (
        <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
        >
            {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
        </button>
    );

    return (
        <div className="min-h-screen w-full bg-[#FAFAFA] text-slate-900 selection:bg-teal-100 lg:grid lg:grid-cols-2">
            {/* Brand panel (desktop only) */}
            <aside className="relative hidden overflow-hidden bg-teal-800 p-12 text-white lg:flex lg:flex-col lg:justify-between">
                <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-teal-500/30 blur-[100px]" />
                <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-emerald-400/20 blur-[100px]" />

                <Link to="/" className="relative flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                        <Activity className="h-5 w-5" />
                    </span>
                    <span className="text-lg font-bold tracking-tight">
                        Shushrut<span className="text-teal-300">AI</span>
                    </span>
                </Link>

                <div className="relative max-w-md">
                    <h1 className="mb-4 text-4xl font-medium leading-tight tracking-tight">
                        Precision <span className="font-serif italic text-teal-200">dermatology</span>, at the point of care.
                    </h1>
                    <p className="mb-10 text-teal-100/80">
                        Decision support for clinicians. Every finding is yours to confirm.
                    </p>
                    <ul className="space-y-4 text-sm text-teal-50">
                        {[
                            [Microscope, "Two CNN classifiers plus a dermoscopic review of each image"],
                            [FileText, "Structured reports ready to export as PDF"],
                            [ShieldCheck, "Patient records scoped to your account"],
                        ].map(([Icon, text]) => (
                            <li key={text} className="flex items-start gap-3">
                                <Icon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-teal-300" aria-hidden="true" />
                                {text}
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="relative text-xs text-teal-200/70">
                    Not a substitute for clinical judgement or histopathology.
                </p>
            </aside>

            {/* Form */}
            <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
                <div className="w-full max-w-md">
                    <Link to="/" className="mb-8 flex items-center gap-2.5 lg:hidden">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white shadow-lg shadow-teal-700/20">
                            <Activity className="h-5 w-5" />
                        </span>
                        <span className="text-lg font-bold tracking-tight">
                            Shushrut<span className="text-teal-600">AI</span>
                        </span>
                    </Link>

                    {mode === "reset" && (
                        <button
                            type="button"
                            onClick={() => switchMode("signin")}
                            className="mb-6 flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-800"
                        >
                            <ArrowLeft className="h-4 w-4" /> Back to sign in
                        </button>
                    )}

                    <h2 className="text-3xl font-semibold tracking-tight text-slate-900">{copy.title}</h2>
                    <p className="mt-2 text-slate-500">{copy.subtitle}</p>

                    {mode !== "reset" && (
                        <div className="mt-8 grid grid-cols-2 rounded-xl bg-slate-100 p-1" role="tablist">
                            {[["signin", "Sign in"], ["signup", "Sign up"]].map(([key, label]) => (
                                <button
                                    key={key}
                                    type="button"
                                    role="tab"
                                    aria-selected={mode === key}
                                    onClick={() => switchMode(key)}
                                    className={`rounded-lg py-2 text-sm font-medium transition ${mode === key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="mt-6 space-y-3" aria-live="polite">
                        {signedOut && mode === "signin" && !error && !notice && (
                            <div className="flex items-start gap-3 rounded-xl border border-teal-100 bg-teal-50 p-3.5 text-sm text-teal-800">
                                <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                                You've been signed out.
                            </div>
                        )}
                        {notice && (
                            <div className="flex items-start gap-3 rounded-xl border border-teal-100 bg-teal-50 p-3.5 text-sm text-teal-800">
                                <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                                {notice}
                            </div>
                        )}
                        {error && (
                            <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-3.5 text-sm text-red-700">
                                <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                                {error}
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                        {mode === "signup" && (
                            <Field
                                id="fullName" label="Full name" icon={User}
                                type="text" autoComplete="name" required
                                placeholder="Dr. Priya Sharma"
                                value={fullName} onChange={(e) => setFullName(e.target.value)}
                            />
                        )}

                        <Field
                            id="email" label="Work email" icon={Mail}
                            type="email" autoComplete="email" required
                            placeholder="you@clinic.com"
                            value={email} onChange={(e) => setEmail(e.target.value)}
                        />

                        {mode !== "reset" && (
                            <div className="space-y-1.5">
                                <Field
                                    id="password" label="Password" icon={Lock}
                                    type={showPassword ? "text" : "password"}
                                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                                    required minLength={mode === "signup" ? 6 : undefined}
                                    placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                                    value={password} onChange={(e) => setPassword(e.target.value)}
                                    trailing={passwordToggle}
                                />
                                {mode === "signin" && (
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => switchMode("reset")}
                                            className="text-sm font-medium text-teal-700 transition hover:text-teal-800 hover:underline"
                                        >
                                            Forgot password?
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {mode === "signup" && (
                            <Field
                                id="confirmPassword" label="Confirm password" icon={Lock}
                                type={showPassword ? "text" : "password"}
                                autoComplete="new-password" required
                                placeholder="Re-enter your password"
                                value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 py-3.5 font-semibold text-white shadow-lg shadow-teal-700/20 transition hover:bg-teal-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                            {copy.submit}
                        </button>
                    </form>

                    {mode !== "reset" && (
                        <>
                            <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
                                <div className="h-px flex-1 bg-slate-200" />
                                or
                                <div className="h-px flex-1 bg-slate-200" />
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogleSignIn}
                                disabled={loading}
                                className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-3 font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Continue with Google
                            </button>
                        </>
                    )}

                    <p className="mt-8 text-center text-xs text-slate-400">
                        For use by licensed clinicians. AI output is decision support, not a diagnosis.
                    </p>
                </div>
            </main>
        </div>
    );
}
