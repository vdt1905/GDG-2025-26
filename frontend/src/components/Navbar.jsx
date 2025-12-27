import React from "react";
import useAuthStore from "../store/authStore";
import { User, Menu, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Navbar({ toggleSidebar, isSidebarCollapsed }) {
    const currentUser = useAuthStore((state) => state.currentUser);

    return (
        <motion.header
            initial={false}
            animate={{ left: isSidebarCollapsed ? 80 : 256 }}
            className={`fixed top-0 right-0 h-16 bg-white/70 backdrop-blur-xl border-b border-emerald-100/50 z-40 flex items-center justify-between px-6 shadow-sm`}
        >
            <div className="flex items-center gap-4">
                <motion.button
                    onClick={toggleSidebar}
                    whileHover={{ scale: 1.05, backgroundColor: "rgba(241, 245, 249, 1)" }}
                    whileTap={{ scale: 0.95 }}
                    className="p-2 rounded-xl text-slate-500 focus:outline-none transition-colors border border-transparent hover:border-slate-200"
                >
                    <Menu className="w-5 h-5" />
                </motion.button>
            </div>

            <div className="flex items-center gap-6">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative p-2 rounded-full hover:bg-slate-100 text-slate-500/80 hover:text-emerald-600 transition-colors"
                >
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </motion.button>

                {/* Doctor Profile (Right) - Now Clickable */}
                <Link to="/profile" className="group">
                    <div className="flex items-center gap-3 pl-6 border-l border-slate-200 cursor-pointer">
                        <div className="text-right hidden sm:block">
                            <motion.p
                                className="text-sm font-bold text-slate-700 group-hover:text-emerald-600 transition-colors leading-tight tracking-wide"
                                layoutId="profileName"
                            >
                                {currentUser?.displayName || "Dr. Shushrut"}
                            </motion.p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest leading-tight">Dermatologist</p>
                        </div>
                        <motion.div
                            className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden ring-2 ring-emerald-100 group-hover:ring-emerald-400 transition-all shadow-sm"
                            whileHover={{ scale: 1.1 }}
                        >
                            {currentUser?.photoURL ? (
                                <img src={currentUser.photoURL} alt="Doctor" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-5 h-5 text-emerald-600" />
                            )}
                        </motion.div>
                    </div>
                </Link>
            </div>
        </motion.header>
    );
}
