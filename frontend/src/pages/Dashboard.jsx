import Layout from "../components/Layout";
import { Users, UserPlus, Image as ImageIcon, TrendingUp, Calendar, Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import api from "../lib/axios";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Dashboard() {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState([
        { label: "Total Patients", value: "0", icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
        { label: "New This Month", value: "0", icon: UserPlus, color: "text-teal-600", bg: "bg-teal-100" },
        { label: "Images Uploaded", value: "0", icon: ImageIcon, color: "text-purple-600", bg: "bg-purple-100" },
    ]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get("/patients");
                const data = res.data;
                setPatients(data);

                // Calculate Stats
                const totalPatients = data.length;

                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const newThisMonth = data.filter(p => new Date(p.createdAt) >= startOfMonth).length;

                const totalImages = data.reduce((acc, curr) => {
                    let count = 0;
                    if (curr.profileImage) count++;
                    if (curr.skinImages && Array.isArray(curr.skinImages)) count += curr.skinImages.length;
                    return acc + count;
                }, 0);

                setStats([
                    { label: "Total Patients", value: totalPatients.toString(), icon: Users, color: "text-blue-600", bg: "bg-blue-100" },
                    { label: "New This Month", value: newThisMonth.toString(), icon: UserPlus, color: "text-teal-600", bg: "bg-teal-100" },
                    { label: "Images Uploaded", value: totalImages.toString(), icon: ImageIcon, color: "text-purple-600", bg: "bg-purple-100" },
                ]);

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return <Layout><div className="flex justify-center p-20"><Loader2 className="animate-spin text-teal-600" /></div></Layout>;

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <Layout>
            <div className="space-y-8 animate-fade-in-up">
                {/* Welcome Banner - Light Theme */}
                <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-100 p-8 md:p-12 shadow-xl shadow-slate-200/50">
                    <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-100 rounded-full blur-[80px] opacity-60"></div>
                    <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-teal-100 rounded-full blur-[80px] opacity-60"></div>

                    <div className="relative z-10 max-w-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs font-bold uppercase tracking-widest">
                                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-slate-400 text-sm font-medium">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 leading-tight text-slate-900">
                            Good {new Date().getHours() < 12 ? "Morning" : new Date().getHours() < 18 ? "Afternoon" : "Evening"}, <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                                Doctor.
                            </span>
                        </h1>
                        <p className="text-slate-500 text-lg max-w-xl font-medium">
                            Overview of your practice. You have <strong className="text-emerald-700">{stats[1].value} new patients</strong> this month.
                        </p>
                    </div>
                </div>

                {/* Main Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">

                    {/* Stat Card 1: Total Patients (Large) */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="md:col-span-2 p-8 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col justify-between overflow-hidden relative group"
                    >
                        <div className="absolute right-0 top-0 w-32 h-32 bg-slate-50 rounded-bl-[100px] transition-transform group-hover:scale-110"></div>
                        <div className="relative z-10">
                            <div className="p-4 bg-sky-50 w-fit rounded-2xl mb-6 text-sky-600 border border-sky-100">
                                <Users className="w-8 h-8" />
                            </div>
                            <h3 className="text-5xl font-black text-slate-800 mb-2 tracking-tight">{stats[0].value}</h3>
                            <p className="text-slate-500 font-bold uppercase tracking-wide text-xs">Total Registered Patients</p>
                        </div>
                    </motion.div>

                    {/* Stat Card 2: New This Month */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="p-8 rounded-3xl bg-emerald-50 border border-emerald-100 shadow-xl shadow-emerald-100/50 flex flex-col justify-between group"
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-4 bg-white w-fit rounded-2xl text-emerald-600 shadow-sm border border-emerald-100">
                                <UserPlus className="w-8 h-8" />
                            </div>
                        </div>
                        <div>
                            <h3 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">{stats[1].value}</h3>
                            <p className="text-emerald-800 font-bold uppercase tracking-wide text-xs">New This Month</p>
                        </div>
                    </motion.div>

                    {/* Stat Card 3: Images Uploaded */}
                    <motion.div
                        whileHover={{ y: -5 }}
                        className="p-8 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col justify-between group relative overflow-hidden"
                    >
                        <div className="relative z-10 flex justify-between items-start mb-6">
                            <div className="p-4 bg-purple-50 w-fit rounded-2xl text-purple-600 border border-purple-100">
                                <ImageIcon className="w-8 h-8" />
                            </div>
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-4xl font-black text-slate-800 mb-2 tracking-tight">{stats[2].value}</h3>
                            <p className="text-slate-500 font-bold uppercase tracking-wide text-xs">Total Images Analyzed</p>
                        </div>
                    </motion.div>

                    {/* Action Card: Register Patient - Light Theme */}
                    <Link to="/register-patient" className="group md:col-span-1">
                        <motion.div
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="h-full p-6 rounded-3xl bg-white border border-slate-200 flex flex-col items-center justify-center text-center gap-4 shadow-xl shadow-slate-200/50 hover:border-emerald-300 transition-all cursor-pointer overflow-hidden relative"
                        >
                            <div className="absolute inset-0 bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative z-10 w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                                <UserPlus className="w-8 h-8 text-emerald-600" />
                            </div>
                            <div className="relative z-10">
                                <h3 className="text-lg font-bold text-slate-800">New Patient</h3>
                                <p className="text-emerald-600 font-medium text-xs uppercase tracking-wider">Initialize Record</p>
                            </div>
                        </motion.div>
                    </Link>

                    {/* Recent Patients List (Wide) */}
                    <div className="md:col-span-3 lg:col-span-3 p-8 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/50">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Recent Activity</h3>
                                <p className="text-slate-400 text-sm font-medium">Real-time patient updates</p>
                            </div>
                            <Link to="/patients" className="px-5 py-2.5 rounded-xl bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider hover:bg-slate-100 transition-colors border border-slate-200">
                                View Full History
                            </Link>
                        </div>

                        <div className="space-y-3">
                            {patients.length > 0 ? (
                                patients.slice(0, 5).map((patient, i) => (
                                    <Link key={patient.id || i} to={`/patients/${patient.id}`}>
                                        <motion.div
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="group flex items-center p-4 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all bg-white shadow-sm hover:shadow-md"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors mr-5">
                                                {patient.name.charAt(0)}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-bold text-slate-800 text-base group-hover:text-emerald-700 transition-colors">{patient.name}</h4>
                                                <p className="text-xs text-slate-400 font-medium">ID: {patient.id?.slice(0, 8).toUpperCase()}</p>
                                            </div>
                                            <div className="text-right hidden sm:block">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 group-hover:border-emerald-100 group-hover:text-emerald-600 transition-colors">
                                                    {new Date(patient.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </motion.div>
                                    </Link>
                                ))
                            ) : (
                                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <p className="text-slate-400 font-medium italic">No recent activity found.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
