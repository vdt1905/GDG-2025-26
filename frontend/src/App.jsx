import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import useAuthStore from "./store/authStore";
import usePatientsStore from "./store/patientsStore";
import PrivateRoute from "./components/PrivateRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import RegisterPatient from "./pages/RegisterPatient";
import Patients from "./pages/Patients";
import PatientDetails from "./pages/PatientDetails";
import React from "react";
import ChatbotInterface from "./components/ChatbotInterface";
import LandingPage from "./pages/LandingPage";
import DoctorProfile from "./pages/DoctorProfile";
import FutureAspect from "./pages/FutureAspect";
import LoadingScreen from "./components/LoadingScreen";

function App() {
  const { initializeAuth, loading } = useAuthStore();
  const uid = useAuthStore((state) => state.currentUser?.uid);
  const fetchPatients = usePatientsStore((state) => state.fetchPatients);

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return () => unsubscribe();
  }, [initializeAuth]);

  // Start loading the patient list the moment we know who is signed in, so it
  // downloads while the dashboard route is still rendering instead of after.
  useEffect(() => {
    if (uid) fetchPatients();
  }, [uid, fetchPatients]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <ChatbotInterface />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/future-aspect" element={<FutureAspect />} />

        {/* Private Routes */}
        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<DoctorProfile />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/register-patient" element={<RegisterPatient />} />
          <Route path="/patients/:id" element={<PatientDetails />} />
          
        </Route>

      </Routes>
    </Router >
  );
}

export default App;
