import { create } from 'zustand';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    updateProfile
} from "firebase/auth";
import { auth } from "../firebase";

const useAuthStore = create((set) => ({
    currentUser: null,
    loading: true,

    initializeAuth: () => {
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
        }
        return userCredential;
    },

    login: async (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    },

    loginWithGoogle: async () => {
        const provider = new GoogleAuthProvider();
        return signInWithPopup(auth, provider);
    },

    logout: async () => {
        return signOut(auth);
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

export default useAuthStore;
