import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import useAuthStore from "./store/authStore";
import PrivateRoute from "./components/PrivateRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import RegisterPatient from "./pages/RegisterPatient";
import Patients from "./pages/Patients";
import PatientDetails from "./pages/PatientDetails";
import React from "react";
import LandingPage from "./pages/LandingPage";
import DoctorProfile from "./pages/DoctorProfile";

function App() {
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return () => unsubscribe();
  }, [initializeAuth]);

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />

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
