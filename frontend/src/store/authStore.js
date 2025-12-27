import { create } from 'zustand';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup
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

    signup: async (email, password) => {
        return createUserWithEmailAndPassword(auth, email, password);
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
    }
}));

export default useAuthStore;
