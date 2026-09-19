import { Navigate, Outlet, useLocation } from "react-router-dom";
import useAuthStore from "../store/authStore";
import React from "react";

export default function PrivateRoute() {
    const { currentUser, loading } = useAuthStore();
    const location = useLocation();

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    // Remember the page so Login can send the user back after signing in.
    return currentUser ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
}
