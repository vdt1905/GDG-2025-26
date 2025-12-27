import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../store/authStore";
import React from "react";

export default function PrivateRoute() {
    const { currentUser, loading } = useAuthStore();

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    return currentUser ? <Outlet /> : <Navigate to="/login" />;
}
