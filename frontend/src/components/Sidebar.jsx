import { Link, useLocation } from "react-router-dom";
import useAuthStore from "../store/authStore";
import { LayoutDashboard, Users, UserPlus, LogOut, Activity, Sparkles } from "lucide-react";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";


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
        <motion.div
            initial={false}
            animate={{ width: isCollapsed ? 80 : 256 }}
            transition={{ duration: 0.3, type: "spring", stiffness: 100, damping: 15 }}
            className={`h-screen bg-white border-r border-slate-200 flex flex-col fixed left-0 top-0 z-50`}
        >
            <div className={`p-6 border-b border-slate-100 flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
                <motion.div
                    animate={{ rotate: isCollapsed ? 0 : 360 }}
                    transition={{ duration: 1, ease: "easeInOut" }}
                >
                    <Activity className="w-8 h-8 text-teal-600 shrink-0" />
                </motion.div>
                <AnimatePresence>
                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            className="overflow-hidden whitespace-nowrap"
                        >
                            <Link to="/">
                                <span className="text-xl font-bold text-teal-700 block cursor-pointer">
                                    Shushrut
                                </span>
                            </Link>
                            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Derm Portal</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <nav className="flex-1 p-3 space-y-2 mt-2">
                {navItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            title={isCollapsed ? item.label : ""}
                            className="relative block group"
                        >
                            <motion.div
                                className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all relative z-10 ${active
                                    ? "text-teal-700 font-bold"
                                    : "text-slate-500 hover:text-slate-900 font-medium"
                                    } ${isCollapsed ? "justify-center" : ""}`}
                            >
                                <item.icon className={`relative z-10 transition-colors ${active ? "w-6 h-6" : "w-5 h-5 group-hover:text-teal-600"}`} />
                                <AnimatePresence>
                                    {!isCollapsed && (
                                        <motion.span
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            className="relative z-10"
                                        >
                                            {item.label}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </motion.div>

                            {/* Animated Background for Active/Hover */}
                            {active && (
                                <motion.div
                                    layoutId="activeNav"
                                    className="absolute inset-0 bg-teal-50 rounded-xl"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                            {!active && (
                                <div className="absolute inset-0 bg-slate-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-3 border-t border-slate-100">
                <button
                    onClick={() => logout()}
                    title={isCollapsed ? "Sign Out" : ""}
                    className={`group flex items-center gap-3 px-3 py-3 w-full rounded-xl text-red-500 hover:bg-red-50 transition-colors relative ${isCollapsed ? "justify-center" : ""}`}
                >
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <LogOut className="w-5 h-5" />
                    </motion.div>
                    <AnimatePresence>
                        {!isCollapsed && (
                            <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: "auto" }}
                                exit={{ opacity: 0, width: 0 }}
                                className="font-medium whitespace-nowrap overflow-hidden"
                            >
                                Sign Out
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>
            </div>
        </motion.div>
    );
}
