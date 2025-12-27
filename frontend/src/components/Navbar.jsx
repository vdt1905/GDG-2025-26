import React from "react";
import useAuthStore from "../store/authStore";
import { User, Menu, Bell } from "lucide-react";
import { Link } from "react-router-dom";

export default function Navbar({ toggleSidebar, isSidebarCollapsed }) {
    const currentUser = useAuthStore((state) => state.currentUser);

    return (
        <header className={`fixed top-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 z-40 transition-all duration-300 flex items-center justify-between px-6 ${isSidebarCollapsed ? "left-20" : "left-64"}`}>
            <div className="flex items-center gap-4">
                <button
                    onClick={toggleSidebar}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 focus:outline-none"
                >
                    <Menu className="w-5 h-5" />
                </button>


            </div>

            <div className="flex items-center gap-6">
                <button className="relative p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                </button>

                {/* Doctor Profile (Right) - Now Clickable */}
                <Link to="/profile" className="flex items-center gap-3 pl-6 border-l border-slate-200 cursor-pointer group">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-bold text-slate-700 group-hover:text-teal-700 transition-colors leading-tight">
                            {currentUser?.displayName || "Dr. Shushrut"}
                        </p>
                        <p className="text-xs text-slate-400 leading-tight">Dermatologist</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center overflow-hidden ring-2 ring-transparent group-hover:ring-teal-200 transition-all">
                        {currentUser?.photoURL ? (
                            <img src={currentUser.photoURL} alt="Doctor" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-6 h-6 text-teal-600" />
                        )}
                    </div>
                </Link>
            </div>
        </header>
    );
}
