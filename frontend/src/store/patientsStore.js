import { create } from 'zustand';
import api from "../lib/axios";

// Shared cache of the doctor's patient list (GET /patients).
//
// Dashboard and Patients both need this list. Fetching it per page meant every
// visit sat on a spinner for a full round trip. Instead: start the request as
// soon as auth resolves (see App.jsx), let pages render whatever is cached
// immediately, and refresh in the background (stale-while-revalidate).
//
// Kept in memory only: this is patient data, so it is not written to
// localStorage and is dropped on sign-out.
let inflight = null;
// Bumped by clear(); a response from before sign-out must not repopulate the cache.
let generation = 0;

const usePatientsStore = create((set, get) => ({
    patients: [],
    loaded: false,   // true once at least one fetch has succeeded
    error: null,

    // Concurrent callers share one request instead of each firing their own.
    fetchPatients: () => {
        if (inflight) return inflight;
        const gen = generation;
        inflight = api.get("/patients")
            .then((res) => {
                if (gen !== generation) return [];
                set({ patients: res.data, loaded: true, error: null });
                return res.data;
            })
            .catch((err) => {
                console.error("Error fetching patients:", err);
                if (gen === generation) set({ error: err });
                return get().patients;
            })
            .finally(() => {
                if (gen === generation) inflight = null;
            });
        return inflight;
    },

    clear: () => {
        generation += 1;
        inflight = null;
        set({ patients: [], loaded: false, error: null });
    },
}));

export default usePatientsStore;
