import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useParams, Link } from "react-router-dom";
import useAuthStore from "../store/authStore";
import api from "../lib/axios";
import { ArrowLeft, Calendar, Mail, Phone, User, Activity, Plus, Loader2 } from "lucide-react";
import React from "react";
export default function PatientDetails() {
    const { id } = useParams();
    const currentUser = useAuthStore((state) => state.currentUser);
    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPatient = async () => {
            if (!currentUser) return;
            try {
                const response = await api.get(`/patients/${id}`);
                setPatient(response.data);
            } catch (error) {
                console.error("Error fetching patient:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPatient();
    }, [id, currentUser]);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("image", file);

        try {
            setLoading(true);
            await api.post(`/patients/${id}/images`, formData);

            // Refresh patient data
            const response = await api.get(`/patients/${id}`);
            setPatient(response.data);
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Failed to upload image.");
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Layout><div className="p-10 text-center"><Loader2 className="animate-spin inline-block w-8 h-8 text-teal-600" /></div></Layout>;
    if (!patient) return <Layout><div className="p-10 text-center">Patient not found</div></Layout>;

    return (
        <Layout>
            <div className="animate-fade-in">
                <Link to="/patients" className="inline-flex items-center text-slate-500 hover:text-teal-600 mb-6 transition-colors font-medium">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to Patients
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Patient Info Card */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="glass-panel p-6 rounded-xl shadow-lg border-t-4 border-teal-500">
                            <div className="flex flex-col items-center mb-6">
                                <div className="w-24 h-24 rounded-full bg-slate-100 mb-4 overflow-hidden border-4 border-white shadow-sm">
                                    {patient.profileImage || patient.imageUrl ? (
                                        <img src={patient.profileImage || patient.imageUrl} alt={patient.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-10 h-10 text-slate-400 m-auto mt-6" />
                                    )}
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800">{patient.name}</h2>
                                {patient.dob ? (
                                    <p className="text-slate-500 font-medium">
                                        DOB: {new Date(patient.dob).toLocaleDateString()} • {patient.gender}
                                    </p>
                                ) : (
                                    <p className="text-slate-500 font-medium">{patient.age} years • {patient.gender}</p>
                                )}
                                {patient.caseId && (
                                    <span className="mt-2 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-mono rounded-full">
                                        {patient.caseId}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                    <Activity className="w-5 h-5 text-teal-600" />
                                    <div className="text-sm">
                                        <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Blood Group</p>
                                        <p className="text-slate-700 font-medium">{patient.bloodGroup || "N/A"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                    <Mail className="w-5 h-5 text-teal-600" />
                                    <div className="text-sm">
                                        <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Email</p>
                                        <p className="text-slate-700 font-medium">{patient.email || "N/A"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                    <Phone className="w-5 h-5 text-teal-600" />
                                    <div className="text-sm">
                                        <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Phone</p>
                                        <p className="text-slate-700 font-medium">{patient.phone || "N/A"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                    <Calendar className="w-5 h-5 text-teal-600" />
                                    <div className="text-sm">
                                        <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Registered</p>
                                        <p className="text-slate-700 font-medium">
                                            {patient.createdAt && typeof patient.createdAt === 'string'
                                                ? new Date(patient.createdAt).toLocaleDateString()
                                                : (patient.createdAt && patient.createdAt._seconds
                                                    ? new Date(patient.createdAt._seconds * 1000).toLocaleDateString()
                                                    : 'N/A')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Clinical Data */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="glass-panel p-6 rounded-xl shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <Activity className="w-5 h-5 text-teal-600" />
                                <h3 className="text-lg font-bold text-slate-800">Medical History / Notes</h3>
                            </div>
                            <p className="text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
                                {patient.history || "No medical history recorded."}
                            </p>
                        </div>

                        <div className="glass-panel p-6 rounded-xl shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-slate-800">Skin Images Gallery</h3>
                                <label className="flex items-center gap-2 text-sm bg-teal-50 text-teal-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-teal-100 transition-colors cursor-pointer">
                                    <Plus className="w-4 h-4" /> Add Image
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                </label>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {patient.skinImages && patient.skinImages.length > 0 ? (
                                    patient.skinImages.map((img, idx) => (
                                        <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-slate-200 shadow-sm cursor-pointer hover:opacity-90 transition-opacity relative group">
                                            <img src={img} alt={`Scan ${idx}`} className="w-full h-full object-cover" />
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full py-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                                        No specific skin images uploaded yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
