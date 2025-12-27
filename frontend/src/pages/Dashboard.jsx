import Layout from "../components/Layout";
import { Users, UserPlus, Image as ImageIcon, TrendingUp, Calendar, Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import api from "../lib/axios";
import { Link } from "react-router-dom";

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

    return (
        <Layout>
            <div className="mb-8 animate-fade-in">
                <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
                <p className="text-slate-500 mt-1">Welcome back, Doctor.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {stats.map((stat, index) => (
                    <div key={index} className="glass-panel p-6 rounded-xl hover:shadow-lg transition-shadow animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-3 rounded-lg ${stat.bg}`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                            <span className="flex items-center text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                <TrendingUp className="w-3 h-3 mr-1" /> Live
                            </span>
                        </div>
                        <h3 className="text-3xl font-bold text-slate-800">{stat.value}</h3>
                        <p className="text-sm text-slate-500 font-medium mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 glass-panel rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-800">Recent Patients</h3>
                        <Link to="/patients" className="text-teal-600 text-sm font-semibold hover:text-teal-700">View All</Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left border-b border-slate-100">
                                    <th className="pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                                    <th className="pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Created At</th>
                                    <th className="pb-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {patients.length > 0 ? (
                                    patients.slice(0, 5).map((patient, i) => (
                                        <tr key={patient.id || i} className="group hover:bg-slate-50 transition-colors">
                                            <td className="py-4 font-medium text-slate-700">
                                                <Link to={`/patients/${patient.id}`} className="hover:text-teal-600">
                                                    {patient.name}
                                                </Link>
                                            </td>
                                            <td className="py-4 text-slate-500">
                                                {patient.createdAt
                                                    ? new Date(patient.createdAt).toLocaleDateString()
                                                    : 'N/A'}
                                            </td>
                                            <td className="py-4">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                                                    Active
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="py-8 text-center text-slate-500">No patients found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="glass-panel rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 mb-6">Quick Actions</h3>
                    <div className="space-y-3">
                        <Link to="/register-patient" className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2">
                            <UserPlus className="w-4 h-4" /> Register New Patient
                        </Link>
                        {/* 
                        <button className="w-full py-3 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                            <ImageIcon className="w-4 h-4" /> Upload Image
                        </button>
                        */}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
