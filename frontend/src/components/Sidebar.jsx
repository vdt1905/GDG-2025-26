import { Link, useLocation } from "react-router-dom";
import useAuthStore from "../store/authStore";
import { LayoutDashboard, Users, UserPlus, LogOut, Activity } from "lucide-react";
import React from "react";

export default function Sidebar({ isCollapsed }) {
    const logout = useAuthStore((state) => state.logout);
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    const navItems = [
        { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { path: "/patients", icon: Users, label: "Patients" },
        { path: "/register-patient", icon: UserPlus, label: "Register Patient" },
    ];

    return (
        <div className={`h-screen bg-white border-r border-slate-200 flex flex-col fixed left-0 top-0 z-50 transition-all duration-300 ${isCollapsed ? "w-20" : "w-64"}`}>
            <div className={`p-6 border-b border-slate-100 flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
                <Activity className="w-8 h-8 text-teal-600 shrink-0" />
                {!isCollapsed && (
                    <div className="overflow-hidden whitespace-nowrap">
                        <span className="text-xl font-bold text-teal-700 block">Shushrut</span>
                        <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Derm Portal</p>
                    </div>
                )}
            </div>

            <nav className="flex-1 p-3 space-y-2 mt-2">
                {navItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        title={isCollapsed ? item.label : ""}
                        className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all group ${isActive(item.path)
                                ? "bg-teal-50 text-teal-700 font-bold shadow-sm"
                                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium"
                            } ${isCollapsed ? "justify-center" : ""}`}
                    >
                        <item.icon className={`transition-colors ${isActive(item.path) ? "w-6 h-6" : "w-5 h-5 group-hover:text-teal-600"}`} />
                        {!isCollapsed && <span>{item.label}</span>}

                        {/* Status dot for active state in collapsed mode */}
                        {isCollapsed && isActive(item.path) && (
                            <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-teal-600 rounded-l-full"></span>
                        )}
                    </Link>
                ))}
            </nav>

            <div className="p-3 border-t border-slate-100">
                <button
                    onClick={() => logout()}
                    title={isCollapsed ? "Sign Out" : ""}
                    className={`flex items-center gap-3 px-3 py-3 w-full rounded-xl text-red-500 hover:bg-red-50 transition-colors ${isCollapsed ? "justify-center" : ""}`}
                >
                    <LogOut className="w-5 h-5" />
                    {!isCollapsed && <span className="font-medium">Sign Out</span>}
                </button>
            </div>
        </div>
    );
}
