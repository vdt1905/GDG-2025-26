import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Loader2 } from "lucide-react";
import useAuthStore from "../store/authStore";
import React from "react";

export default function SignOutDialog({ open, onClose }) {
    const logout = useAuthStore((state) => state.logout);
    const currentUser = useAuthStore((state) => state.currentUser);
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const cancelRef = useRef(null);

    // Clear any failed attempt so it isn't shown the next time the dialog opens.
    const close = () => {
        if (busy) return;
        setError("");
        onClose();
    };

    // Focus the safe option, and close on Escape.
    useEffect(() => {
        if (!open) return;
        cancelRef.current?.focus();
        const onKey = (e) => {
            if (e.key === "Escape" && !busy) {
                setError("");
                onClose();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, busy, onClose]);

    const handleSignOut = async () => {
        setError("");
        setBusy(true);
        try {
            await logout();
            navigate("/login", { replace: true, state: { signedOut: true } });
        } catch (err) {
            console.error("Sign out failed:", err);
            setError("Couldn't sign out. Check your connection and try again.");
            setBusy(false);
        }
    };

    const who = currentUser?.displayName || currentUser?.email;

    return createPortal(
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={close}
                >
                    <motion.div
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="signout-title"
                        aria-describedby="signout-desc"
                        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
                        initial={{ scale: 0.95, y: 8 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 8 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
                            <LogOut className="h-5 w-5" />
                        </div>
                        <h2 id="signout-title" className="text-lg font-semibold text-slate-900">Sign out?</h2>
                        <p id="signout-desc" className="mt-1.5 text-sm text-slate-500">
                            {who ? <>You're signed in as <span className="font-medium text-slate-700">{who}</span>. </> : null}
                            You'll need to sign in again to see your patients.
                        </p>

                        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

                        <div className="mt-6 flex gap-3">
                            <button
                                ref={cancelRef}
                                type="button"
                                onClick={close}
                                disabled={busy}
                                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSignOut}
                                disabled={busy}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-70"
                            >
                                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                                Sign out
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
