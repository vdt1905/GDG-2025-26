import { create } from 'zustand';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    sendPasswordResetEmail,
    updateProfile
} from "firebase/auth";
import { auth } from "../firebase";
import api from "../lib/axios";
import usePatientsStore from "./patientsStore";

/**
 * Create the doctor's Firestore profile via POST /api/doctors/profile.
 *
 * Called once on first sign-up / first Google sign-in. Best-effort: a failure
 * must not block sign-in, and a 409 just means the profile already exists
 * (a returning Google user), so it is not an error.
 */
async function createDoctorProfile(fields) {
    try {
        await api.post("/doctors/profile", fields);
    } catch (err) {
        if (err?.response?.status !== 409) {
            console.error("Could not create doctor profile:", err);
        }
    }
}

// Popup errors where a full-page redirect will still work. Browsers that block
// popups, or enforce a strict Cross-Origin-Opener-Policy (the "COOP would block
// the window.closed call" console warning), land here.
const POPUP_FALLBACK_CODES = new Set([
    "auth/popup-blocked",
    "auth/operation-not-supported-in-environment",
    "auth/web-storage-unsupported",
]);

const useAuthStore = create((set) => ({
    currentUser: null,
    loading: true,

    initializeAuth: () => {
        // Completes a Google sign-in that fell back to signInWithRedirect.
        // onAuthStateChanged below picks up the user; this only surfaces errors.
        getRedirectResult(auth).catch((err) => {
            console.error("Google redirect sign-in failed:", err);
        });

        // Set up the listener only once
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            set({ currentUser: user, loading: false });
        });
        return unsubscribe;
    },

    signup: async (email, password, fullName) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (fullName) {
            await updateProfile(userCredential.user, {
                displayName: fullName
            });
            // onAuthStateChanged fired before the name was set; refresh local state.
            set({ currentUser: { ...userCredential.user, displayName: fullName } });
        }
        // Firebase Auth only stores credentials; the doctor's record lives in
        // Firestore and is created by the backend route.
        await createDoctorProfile({ name: fullName });
        return userCredential;
    },

    login: async (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    },

    // Resolves to the credential, or null when it fell back to a redirect (the
    // page is navigating away, so the caller must not navigate itself).
    loginWithGoogle: async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        try {
            const result = await signInWithPopup(auth, provider);
            // First Google sign-in has no Firestore record yet; a repeat sign-in
            // gets a 409 back, which createDoctorProfile ignores.
            await createDoctorProfile({ name: result.user.displayName });
            return result;
        } catch (err) {
            if (POPUP_FALLBACK_CODES.has(err?.code)) {
                await signInWithRedirect(auth, provider);
                return null;
            }
            throw err;
        }
    },

    resetPassword: async (email) => {
        return sendPasswordResetEmail(auth, email);
    },

    logout: async () => {
        await signOut(auth);
        usePatientsStore.getState().clear();
        set({ currentUser: null });
    },

    updateUserProfile: async (updates) => {
        if (auth.currentUser) {
            await updateProfile(auth.currentUser, updates);
            // Force update local state
            set({
                currentUser: { ...auth.currentUser, ...updates }
            });
        }
    }
}));

// Firebase error codes -> messages a clinician can act on.
const AUTH_ERROR_MESSAGES = {
    "auth/invalid-credential": "Incorrect email or password.",
    "auth/wrong-password": "Incorrect email or password.",
    "auth/user-not-found": "No account found with this email.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/email-already-in-use": "An account with this email already exists. Sign in instead.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Wait a few minutes, or reset your password.",
    "auth/network-request-failed": "Can't reach the server. Check your connection and try again.",
    "auth/user-disabled": "This account has been disabled. Contact your administrator.",
    "auth/popup-closed-by-user": "Google sign-in was closed before it finished.",
    "auth/cancelled-popup-request": "Google sign-in was closed before it finished.",
    "auth/unauthorized-domain": "Google sign-in isn't enabled for this site yet. Use email and password.",
    "auth/account-exists-with-different-credential": "This email is already registered with a different sign-in method.",
};

export function authErrorMessage(err) {
    return AUTH_ERROR_MESSAGES[err?.code] || "Something went wrong. Please try again.";
}

export default useAuthStore;
