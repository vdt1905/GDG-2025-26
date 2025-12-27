import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useParams, Link, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import api from "../lib/axios";
import { ArrowLeft, Calendar, Mail, Phone, User, Activity, Plus, Loader2, Trash, Trash2, X } from "lucide-react";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function PatientDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
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

    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);

    const handleDeletePatient = async () => {
        if (!window.confirm("Are you sure you want to delete this patient? This action cannot be undone.")) return;
        try {
            await api.delete(`/patients/${id}`);
            navigate("/patients");
        } catch (error) {
            console.error("Error deleting patient:", error);
            alert("Failed to delete patient.");
        }
    };

    const handleDeleteImage = async (imageUrl) => {
        if (!window.confirm("Delete this image?")) return;
        try {
            const response = await api.delete(`/patients/${id}/images?imageUrl=${encodeURIComponent(imageUrl)}`);
            const refreshedPatient = await api.get(`/patients/${id}`);
            setPatient(refreshedPatient.data);
        } catch (error) {
            console.error("Error deleting image:", error);
            alert("Failed to delete image.");
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("image", file);

        try {
            setLoading(true);
            await api.post(`/patients/${id}/images`, formData);
            const response = await api.get(`/patients/${id}`);
            setPatient(response.data);
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Failed to upload image.");
        } finally {
            setLoading(false);
        }
    };

    const handleAnalyze = async (imageUrl) => {
        setAnalyzing(true);
        setAnalysisResult(null);
        try {
            const res = await api.post("/patients/analyze", { imageUrl });
            setAnalysisResult(res.data);
        } catch (error) {
            console.error("Analysis failed:", error);
            alert("Failed to analyze image.");
        } finally {
            setAnalyzing(false);
        }
    };

    if (loading) return <Layout><div className="p-10 text-center"><Loader2 className="animate-spin inline-block w-8 h-8 text-teal-600" /></div></Layout>;
    if (!patient) return <Layout><div className="p-10 text-center">Patient not found</div></Layout>;

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    const item = {
        hidden: { opacity: 0, scale: 0.9 },
        show: { opacity: 1, scale: 1 }
    };

    return (
        <Layout>
            <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                    <Link to="/patients" className="inline-flex items-center text-slate-500 hover:text-teal-600 transition-colors font-medium group">
                        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Patients
                    </Link>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleDeletePatient}
                        className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium border border-transparent hover:border-red-200"
                    >
                        <Trash2 className="w-4 h-4" /> Delete Patient
                    </motion.button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Patient Info Card */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        className="lg:col-span-1 space-y-6"
                    >
                        <div className="glass-panel p-6 rounded-xl shadow-lg border-t-4 border-teal-500 sticky top-24">
                            <div className="flex flex-col items-center mb-6">
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    className="w-24 h-24 rounded-full bg-slate-100 mb-4 overflow-hidden border-4 border-white shadow-sm"
                                >
                                    {patient.profileImage || patient.imageUrl ? (
                                        <img src={patient.profileImage || patient.imageUrl} alt={patient.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <User className="w-10 h-10 text-slate-400 m-auto mt-6" />
                                    )}
                                </motion.div>
                                <h2 className="text-2xl font-bold text-slate-800 text-center">{patient.name}</h2>
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
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-teal-50 transition-colors">
                                    <Activity className="w-5 h-5 text-teal-600" />
                                    <div className="text-sm">
                                        <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Blood Group</p>
                                        <p className="text-slate-700 font-medium">{patient.bloodGroup || "N/A"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-teal-50 transition-colors">
                                    <Mail className="w-5 h-5 text-teal-600" />
                                    <div className="text-sm">
                                        <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Email</p>
                                        <p className="text-slate-700 font-medium">{patient.email || "N/A"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-teal-50 transition-colors">
                                    <Phone className="w-5 h-5 text-teal-600" />
                                    <div className="text-sm">
                                        <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Phone</p>
                                        <p className="text-slate-700 font-medium">{patient.phone || "N/A"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-teal-50 transition-colors">
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
                    </motion.div>

                    {/* Clinical Data */}
                    <div className="lg:col-span-2 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="glass-panel p-6 rounded-xl shadow-sm"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <Activity className="w-5 h-5 text-teal-600" />
                                <h3 className="text-lg font-bold text-slate-800">Medical History / Notes</h3>
                            </div>
                            <p className="text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
                                {patient.history || "No medical history recorded."}
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="glass-panel p-6 rounded-xl shadow-sm"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-slate-800">Skin Images Gallery</h3>
                                <label className="flex items-center gap-2 text-sm bg-teal-50 text-teal-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-teal-100 transition-colors cursor-pointer hover:shadow-md transform hover:-translate-y-0.5">
                                    <Plus className="w-4 h-4" /> Add Image
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                </label>
                            </div>

                            <motion.div
                                variants={container}
                                initial="hidden"
                                animate="show"
                                className="grid grid-cols-2 md:grid-cols-3 gap-4"
                            >
                                {patient.skinImages && patient.skinImages.length > 0 ? (
                                    patient.skinImages.map((img, idx) => (
                                        <motion.div
                                            key={idx}
                                            variants={item}
                                            layoutId={`image-${idx}`}
                                            className="aspect-square rounded-lg overflow-hidden border border-slate-200 shadow-sm relative group bg-slate-100"
                                        >
                                            <img src={img} alt={`Scan ${idx}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 gap-2 backdrop-blur-sm">
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => handleAnalyze(img)}
                                                    className="bg-white text-teal-600 px-3 py-2 rounded-full font-bold text-xs shadow-lg hover:bg-teal-50 transition-colors flex items-center gap-1"
                                                >
                                                    <Activity className="w-3 h-3" /> Analyze
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => handleDeleteImage(img)}
                                                    className="bg-white text-red-600 p-2 rounded-full shadow-lg hover:bg-red-50 transition-colors"
                                                    title="Delete Image"
                                                >
                                                    <Trash className="w-4 h-4" />
                                                </motion.button>
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="col-span-full py-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                                        No specific skin images uploaded yet.
                                    </div>
                                )}
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Analysis Modal */}
            <AnimatePresence>
                {(analyzing || analysisResult) && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/20"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl sticky top-0 z-10">
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <Activity className="w-6 h-6 text-teal-600" /> AI Dermatological Analysis
                                </h3>
                                <button onClick={() => { setAnalysisResult(null); setAnalyzing(false); }} className="text-slate-400 hover:text-red-500 transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="p-8">
                                {analyzing ? (
                                    <div className="text-center py-12">
                                        <Loader2 className="w-16 h-16 text-teal-600 animate-spin mx-auto mb-6" />
                                        <h4 className="text-xl font-bold text-slate-700 mb-2">Analyzing Skin Lesion...</h4>
                                        <p className="text-slate-500">Please wait while our AI models process the image.</p>
                                    </div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                    >
                                        <div className="flex items-center gap-4 mb-8 bg-teal-50 p-6 rounded-xl border border-teal-100">
                                            <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center border-4 border-white shadow-sm">
                                                <Activity className="w-8 h-8 text-teal-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-teal-700 uppercase tracking-wide mb-1">Diagnosis</p>
                                                <h2 className="text-3xl font-bold text-slate-800">{analysisResult.diagnosis}</h2>
                                            </div>
                                            <div className="ml-auto text-right">
                                                <p className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-1">Confidence</p>
                                                <p className="text-2xl font-bold text-teal-600">{(analysisResult.confidence * 100).toFixed(1)}%</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Detailed Report</h4>
                                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 font-mono text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                                    {analysisResult.report}
                                                </div>
                                            </div>

                                            <div className="flex gap-4">
                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    onClick={() => { setAnalysisResult(null); }}
                                                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                                                >
                                                    Close
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                    className="flex-1 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                                                    onClick={() => window.print()}
                                                >
                                                    Print Report
                                                </motion.button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Layout>
    );
}
