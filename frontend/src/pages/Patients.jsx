import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import useAuthStore from "../store/authStore";
import api from "../lib/axios";
import { Link } from "react-router-dom";
import { Search, Loader2, User } from "lucide-react";
import React from "react";
export default function Patients() {
    // We only need current user to know WHEN to fetch (if logged in)
    const currentUser = useAuthStore((state) => state.currentUser);
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchPatients = async () => {
            if (!currentUser) return;

            try {
                // api instance handles header injection automatically
                const response = await api.get("/patients");
                setPatients(response.data);
            } catch (error) {
                console.error("Error fetching patients:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchPatients();
    }, [currentUser]);

    const filteredPatients = patients.filter(patient =>
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const calculateAge = (dob) => {
        if (!dob) return "N/A";
        // Handle ISO string or YYYY-MM-DD
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    return (
        <Layout>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 animate-fade-in">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Patients</h1>
                    <p className="text-slate-500 mt-1">Manage your patient records.</p>
                </div>
                <Link to="/register-patient" className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-medium shadow-md transition-colors">
                    + Add New Patient
                </Link>
            </div>

            <div className="glass-panel p-4 mb-6 rounded-xl flex items-center gap-3">
                <Search className="text-slate-400 w-5 h-5" />
                <input
                    type="text"
                    placeholder="Search patients by name or email..."
                    className="flex-1 bg-transparent outline-none text-slate-700"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPatients.length > 0 ? (
                        filteredPatients.map((patient) => (
                            <Link to={`/patients/${patient.id}`} key={patient.id} className="glass-panel p-6 rounded-xl hover:shadow-lg transition-all group border border-white/50 hover:border-teal-100 block">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">
                                        {patient.profileImage || patient.imageUrl ? (
                                            <img src={patient.profileImage || patient.imageUrl} alt={patient.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-6 h-6 text-slate-400" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-lg group-hover:text-teal-700 transition-colors">{patient.name}</h3>
                                        <p className="text-sm text-slate-500">{calculateAge(patient.dob || patient.age)} yrs • {patient.gender}</p>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-sm">
                                    <span className="text-slate-500">Last Visit: {
                                        patient.lastVisit
                                            ? (typeof patient.lastVisit === 'string' ? new Date(patient.lastVisit).toLocaleDateString() : new Date(patient.lastVisit.seconds * 1000).toLocaleDateString())
                                            : (patient.updatedAt ? new Date(patient.updatedAt).toLocaleDateString() : 'N/A')
                                    }</span>
                                    <span className="text-teal-600 font-medium group-hover:underline">View Details →</span>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="col-span-full text-center py-10 text-slate-500">
                            No patients found.
                        </div>
                    )}
                </div>
            )}
        </Layout>
    );
}
