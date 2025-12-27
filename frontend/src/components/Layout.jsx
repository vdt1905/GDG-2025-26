import { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import React from "react";

export default function Layout({ children }) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);

    return (
        <div className="min-h-screen bg-slate-50 selection:bg-teal-100 selection:text-teal-900">
            {/* Sidebar */}
            <Sidebar isCollapsed={isSidebarCollapsed} />

            {/* Navbar */}
            <Navbar
                toggleSidebar={toggleSidebar}
                isSidebarCollapsed={isSidebarCollapsed}
            />

            {/* Main Content Area */}
            <main
                className={`transition-all duration-300 pt-24 px-8 pb-8 ${isSidebarCollapsed ? "ml-20" : "ml-64"
                    }`}
            >
                <div className="max-w-7xl mx-auto animate-fade-in-up">
                    {children}
                </div>
            </main>
        </div>
    );
}
