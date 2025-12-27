import { useState } from "react";
import useAuthStore from "../store/authStore";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2, Play, AlertCircle } from "lucide-react";
import React from "react";

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Zustand selectors
    const login = useAuthStore((state) => state.login);
    const signup = useAuthStore((state) => state.signup);
    const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            if (isLogin) {
                await login(email, password);
            } else {
                await signup(email, password);
            }
            navigate("/dashboard");
        } catch (err) {
            setError("Failed to " + (isLogin ? "sign in" : "create account") + ": " + err.message);
        }
        setLoading(false);
    };

    const handleGoogleSignIn = async () => {
        try {
            setError("");
            setLoading(true);
            await loginWithGoogle();
            navigate("/dashboard");
        } catch (err) {
            setError("Failed to sign in with Google: " + err.message);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden p-6">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-200/30 rounded-full blur-[100px] mix-blend-multiply" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-teal-200/30 rounded-full blur-[100px] mix-blend-multiply" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
            </div>

            <div className="w-full max-w-md relative z-10 animate-fade-in-up">
                <div className="bg-white/70 backdrop-blur-xl border border-white/60 shadow-2xl rounded-3xl p-8 lg:p-10 ring-1 ring-slate-900/5">

                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 mb-6 border border-emerald-200 shadow-sm transform transition-transform hover:scale-110 duration-300">
                            <Play fill="currentColor" className="w-6 h-6 ml-1" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 italic tracking-tighter mb-2">
                            {isLogin ? "SYSTEM ACCESS" : "NEW REGISTRATION"}
                        </h2>
                        <p className="text-slate-500 text-xs font-bold tracking-widest uppercase">
                            {isLogin ? "Authenticate Credentials" : "Initialize User Protocol"}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-start gap-3 shadow-sm">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span className="font-medium">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Email Identifier</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                <input
                                    type="email"
                                    required
                                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium"
                                    placeholder="doctor@shushrut.ai"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Security Key</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                <input
                                    type="password"
                                    required
                                    className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all font-medium"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 rounded-xl bg-emerald-600 text-white font-black uppercase tracking-wider hover:bg-emerald-700 hover:shadow-[0_10px_20px_rgba(16,185,129,0.2)] transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2 shadow-lg shadow-emerald-600/10"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? "Initialize Session" : "Create Profile")}
                        </button>
                    </form>

                    <div className="mt-8">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-200"></div>
                            </div>
                            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
                                <span className="px-3 bg-white text-slate-400">Alternative Access</span>
                            </div>
                        </div>

                        <button
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            className="mt-6 w-full py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-600 font-bold transition-all flex items-center justify-center gap-3 uppercase tracking-wide text-xs shadow-sm hover:shadow-md"
                        >
                            <svg className="h-5 w-5" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Continue with Google
                        </button>
                    </div>

                    <div className="mt-8 text-center bg-slate-50 py-4 rounded-xl border border-slate-100">
                        <p className="text-xs font-medium text-slate-500">
                            {isLogin ? "No credentials found?" : "Already registered?"}{" "}
                            <button
                                onClick={() => setIsLogin(!isLogin)}
                                className="text-emerald-600 font-bold hover:text-emerald-700 transition-colors uppercase tracking-wider ml-1 hover:underline decoration-2 underline-offset-2"
                            >
                                {isLogin ? "Sign Up" : "Log In"}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
