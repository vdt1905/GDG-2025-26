import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useParams, Link, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import api from "../lib/axios";
import { ArrowLeft, Calendar, Mail, Phone, User, Activity, Plus, Loader2, Trash, Trash2, X, Eye, Download } from "lucide-react";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { jsPDF } from "jspdf";
import ReactMarkdown from 'react-markdown';

// Simple Circular Progress Component
const CircularProgress = ({ value, label, subLabel, color = "text-teal-600" }) => {
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (value / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center">
            <div className="relative w-24 h-24 flex items-center justify-center">
                {/* Background Circle */}
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="48"
                        cy="48"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-slate-100"
                    />
                    {/* Progress Circle */}
                    <circle
                        cx="48"
                        cy="48"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className={`${color} transition-all duration-1000 ease-out`}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className={`text-xl font-bold ${color}`}>{value}%</span>
                </div>
            </div>
            {label && <span className="text-sm font-medium text-slate-600 mt-1">{label}</span>}
            {subLabel && <span className="text-xs text-slate-400">{subLabel}</span>}
        </div>
    );
};

export default function PatientDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const currentUser = useAuthStore((state) => state.currentUser);
    const [patient, setPatient] = useState(null);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [previewReport, setPreviewReport] = useState(null); // State for preview modal

    useEffect(() => {
        const fetchPatientAndReports = async () => {
            if (!currentUser) return;
            try {
                const response = await api.get(`/patients/${id}`);
                setPatient(response.data);

                // Fetch reports (Assuming we might need a direct firestore call or backend endpoint)
                // Since user is migrating to backend-heavy, let's assume we can fetch via a similar pattern 
                // or just use the subcollection provided by backend if exposed.
                // For now, let's try to fetch from a new endpoint we might need, OR just use the firestore client if available.
                // Given the constraints and setup, let's assume the backend 'get patient' MIGHT include reports 
                // OR we need to add a way to get them.
                // Let's add a backend endpoint in main.py? No, main.py is just AI.
                // The NodeJS backend handles /patients. We need to check if it returns subcollections.
                // If not, we might need to add it to the NodeJS backend.

                // WAIT: The user asked for "saved on the page". The Python script writes to Firestore. 
                // The standard pattern here is reading from Firestore on the client or via the Node backend.
                // Let's assume we need to fetch it.

                // HACK: Use direct firestore read if possible, OR add to Node backend.
                // Since I can't easily edit Node backend right now safely without checking it, 
                // and the user has a firebase.js, let's use that if possible.
                // Note: The previous code uses 'api' (axios).

                // Let's rely on the Python script saving it, and assumes we can fetch it.
                // Let's add a helper to fetch reports using the 'api' if the node backend supports it.
                // If not, we'll need to update the node backend.
                // Let's assume the node backend returns full object or we can fetch subcollection.

                // Actually, let's look at `backend/controllers/patientController.js` if it exists (implied by previous context).
                // But for now provided only `main.py` access (User migration to Google stack).

                // Let's try to fetch reports via a new API call: GET /patients/{id}/reports
                const reportsRes = await api.get(`/patients/${id}/reports`);
                setReports(reportsRes.data);

            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchPatientAndReports();
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
            const res = await api.post("/patients/analyze", { patientId: id, imageUrl });
            setAnalysisResult(res.data);
            setPreviewReport(res.data); // Auto-open preview
        } catch (error) {
            console.error("Analysis failed:", error);
            alert("Failed to analyze image.");
        } finally {
            setAnalyzing(false);
        }
    };

    const getDataUri = (url) => {
        return new Promise((resolve) => {
            const image = new Image();
            image.setAttribute('crossOrigin', 'anonymous');
            image.onload = function () {
                const canvas = document.createElement('canvas');
                canvas.width = this.naturalWidth;
                canvas.height = this.naturalHeight;
                canvas.getContext('2d').drawImage(this, 0, 0);
                resolve(canvas.toDataURL('image/jpeg'));
            };
            image.onerror = () => resolve(null);
            image.src = url;
        });
    };

    const generatePDF = async (report, patientData) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPos = 0;

        // --- Helper: Draw Rounded Rect with Shadow effect (Basic) ---
        const drawCard = (x, y, w, h, title) => {
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(220, 220, 220);
            doc.roundedRect(x, y, w, h, 3, 3, 'FD');
            if (title) {
                doc.setFont("helvetica", "bold");
                doc.setFontSize(11);
                doc.setTextColor(30, 41, 59); // Slate 800
                doc.text(title, x + 5, y + 10);
            }
        };

        // --- Helper: Draw Circular Progress (Approximation) ---
        const drawCircle = (x, y, radius, percentage, color) => {
            doc.setLineWidth(1.5);
            doc.setDrawColor(226, 232, 240); // Slate 200 track
            doc.circle(x, y, radius, 'S');

            // Draw Main Arc (Simplified as text for PDF robustnes or just a colored stroke)
            // Note: Arcs in jsPDF are tricky without checking context. 
            // We will just draw a colored circle/text for simplicity and reliability.
            doc.setDrawColor(color[0], color[1], color[2]);
            // Draw a second circle on top to represent 'value' (Visual hack: just draw full circle for now or text)
            // Ideally we use exact arcs but that requires path commands. 
            // Let's stick to a clean textual representation inside a colored ring.
            doc.circle(x, y, radius, 'S');

            doc.setFontSize(10);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(color[0], color[1], color[2]);
            doc.text(`${percentage}%`, x, y + 1, { align: "center", baseline: "middle" });
        };

        // 1. Header (Teal Background)
        doc.setFillColor(13, 148, 136); // Teal-600
        doc.rect(0, 0, pageWidth, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("SKIN DISEASE DIAGNOSIS REPORT", 14, 16);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Powered by Shushrut AI", 160, 16);

        yPos = 40;

        // 2. Top Section: Image (Left) & Patient Profile (Right)

        // Image Frame
        try {
            if (report.imageUrl) {
                const skinImgData = await getDataUri(report.imageUrl);
                if (skinImgData) {
                    doc.addImage(skinImgData, 'JPEG', 14, yPos, 60, 60);
                    // Add "Medical Image" label overlay style (black rect at bottom)
                    doc.setFillColor(0, 0, 0);
                    doc.roundedRect(14, yPos + 52, 25, 6, 1, 1, 'F');
                    doc.setTextColor(255, 255, 255);
                    doc.setFontSize(7);
                    doc.text("Medical Image", 16, yPos + 56);
                }
            }
        } catch (e) { console.error("PDF Image Error", e); }

        // Patient Profile Card (Right of Image)
        const profileX = 80;
        drawCard(profileX, yPos, 115, 60, "Patient Profile");

        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139); // Slate 500 label

        // Row 1
        doc.text("NAME", profileX + 6, yPos + 20);
        doc.text("AGE", profileX + 60, yPos + 20);

        // Row 2
        doc.text("GENDER", profileX + 6, yPos + 38);
        doc.text("STATUS", profileX + 60, yPos + 38);

        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42); // Slate 900 Value
        doc.setFont("helvetica", "bold");

        // Values
        doc.text(patientData.name || "N/A", profileX + 6, yPos + 26);
        doc.text(`${patientData.age || "N/A"} years`, profileX + 60, yPos + 26);
        doc.text(patientData.gender || "N/A", profileX + 6, yPos + 44);

        // Status Badge (Draw Rect)
        doc.setFillColor(240, 253, 244); // Green 50
        doc.setDrawColor(240, 253, 244);
        doc.roundedRect(profileX + 60, yPos + 39, 25, 6, 2, 2, 'FD');
        doc.setTextColor(22, 101, 52); // Green 800
        doc.setFontSize(8);
        doc.text("Active Case", profileX + 62, yPos + 43);

        yPos += 75;

        // 3. Comparison Cards (Verification vs AI Prediction)

        // Parsing Data
        const verifyParts = (report.verify || "").split(',');
        const verifyStatus = verifyParts[0] || "Unknown";
        const verifyConf = Math.round(parseFloat(verifyParts[1]?.replace(/[^0-9.]/g, '')) || 0);
        const verifyType = verifyParts[2] || "Unknown";
        const verifyRemark = verifyParts.slice(3).join(',') || "No remarks.";

        const predParts = (report.prediction || report.pred || "").split(',');
        const predCondition = predParts[0] || "Unknown";
        const predConf = Math.round(parseFloat(predParts[1]?.replace(/[^0-9.]/g, '')) || 0);
        const predRemark = predParts.slice(2).join(',') || "No remarks.";

        // Verification Card (Left)
        drawCard(14, yPos, 90, 60, "Verification");
        // Status Pill
        doc.setFillColor(verifyStatus.toLowerCase().includes('healthy') ? 220 : 254, verifyStatus.toLowerCase().includes('healthy') ? 252 : 226, verifyStatus.toLowerCase().includes('healthy') ? 231 : 226);
        doc.roundedRect(75, yPos + 5, 25, 6, 2, 2, 'F');
        doc.setTextColor(verifyStatus.toLowerCase().includes('healthy') ? 22 : 153, verifyStatus.toLowerCase().includes('healthy') ? 101 : 27, verifyStatus.toLowerCase().includes('healthy') ? 52 : 27);
        doc.setFontSize(8);
        doc.text(verifyStatus, 77, yPos + 9);

        // Circle
        drawCircle(30, yPos + 30, 10, verifyConf, [13, 148, 136]); // Teal
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("Confidence", 30, yPos + 45, { align: "center" });

        // Details
        doc.text("SKIN TYPE", 50, yPos + 25);
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(verifyType, 50, yPos + 31);

        doc.setFontSize(8);
        const splitVerifyRemark = doc.splitTextToSize(`"${verifyRemark}"`, 80);
        doc.setTextColor(71, 85, 105);
        doc.text(splitVerifyRemark, 19, yPos + 52);


        // AI Diagnostics Card (Right)
        drawCard(108, yPos, 90, 60, "AI Diagnostics");
        // Circle
        drawCircle(125, yPos + 30, 10, predConf, [79, 70, 229]); // Indigo 600
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("Probability", 125, yPos + 45, { align: "center" });

        // Details
        doc.text("DETECTED CONDITION", 145, yPos + 25);
        doc.setFontSize(10);
        doc.setTextColor(67, 56, 202); // Indigo 700
        doc.text(predCondition, 145, yPos + 31);

        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        const splitPredRemark = doc.splitTextToSize(predRemark, 80);
        if (splitPredRemark.length > 2) splitPredRemark.length = 2; // Truncate for space
        doc.text(splitPredRemark, 113, yPos + 52);

        yPos += 70;

        // 4. Detailed Report Header
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(13, 148, 136); // Teal
        doc.text("Detailed Medical Analysis", 14, yPos);
        doc.setDrawColor(226, 232, 240);
        doc.line(14, yPos + 3, 200, yPos + 3);
        yPos += 10;

        // 5. Report Content
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10); // increased font size slightly for readability
        doc.setTextColor(15, 23, 42); // Slate 900 Black

        const reportText = report.report || report.pred || "No content available";
        const cleanText = reportText.replace(/[*#]/g, '');
        const splitText = doc.splitTextToSize(cleanText, 180);

        // Robust Pagination Loop
        const lineHeight = 5;
        const pageMarginBottom = 20;

        splitText.forEach(line => {
            if (yPos > pageHeight - pageMarginBottom) {
                doc.addPage();
                yPos = 25; // Top margin for new page
            }
            doc.text(line, 14, yPos);
            yPos += lineHeight;
        });

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184); // Slate 400
            doc.text(`Generated on ${new Date().toLocaleDateString()} - Page ${i} of ${pageCount}`, 14, pageHeight - 10);
            doc.text("Shushrut AI Report", pageWidth - 40, pageHeight - 10);
        }

        doc.save(`${patientData.name.replace(/\s+/g, '_')}_Detailed_Report.pdf`);
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

                        {/* Reports Section */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="glass-panel p-6 rounded-xl shadow-sm"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <Activity className="w-5 h-5 text-teal-600" />
                                <h3 className="text-lg font-bold text-slate-800">Medical Reports History</h3>
                            </div>

                            <div className="space-y-3">
                                {reports && reports.length > 0 ? (
                                    reports.map((report, idx) => (
                                        <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center hover:bg-white hover:shadow-md transition-all">
                                            <div>
                                                <p className="font-bold text-teal-800">Diagnosis Report</p>
                                                <p className="text-xs text-slate-500">
                                                    {report.timestamp && report.timestamp._seconds
                                                        ? new Date(report.timestamp._seconds * 1000).toLocaleString()
                                                        : "Date unavailable"}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setPreviewReport(report)}
                                                    className="text-xs bg-teal-50 hover:bg-teal-100 text-teal-700 px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1"
                                                >
                                                    <Eye className="w-3 h-3" /> View
                                                </button>
                                                <button
                                                    onClick={() => generatePDF(report, patient)}
                                                    className="text-xs bg-slate-200 hover:bg-teal-600 hover:text-white text-slate-700 px-3 py-2 rounded-lg font-medium transition-colors flex items-center gap-1"
                                                >
                                                    <Download className="w-3 h-3" /> PDF
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-slate-400 text-sm text-center py-4">No reports generated yet.</p>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Report Preview Modal */}
            <AnimatePresence>
                {previewReport && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-hidden"
                        onClick={() => setPreviewReport(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="bg-teal-600 p-6 flex justify-between items-center shrink-0 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-r from-teal-600 to-teal-800 opacity-90"></div>
                                <div className="relative z-10 text-white">
                                    <h2 className="text-2xl font-bold">Skin Disease Diagnosis Report</h2>
                                    <p className="text-teal-100 text-sm opacity-90">Powered by Shushrut AI</p>
                                </div>
                                <button
                                    onClick={() => setPreviewReport(null)}
                                    className="relative z-10 bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">

                                {/* Top Section: Image & Profile */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Medical Image */}
                                    <div className="md:col-span-1 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                        <div className="aspect-square rounded-lg overflow-hidden bg-slate-100 relative">
                                            <img
                                                src={previewReport.imageUrl || patient?.imageUrl || "/placeholder.png"}
                                                alt="Medical Scan"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
                                                Medical Image
                                            </div>
                                        </div>
                                    </div>

                                    {/* Patient Profile */}
                                    <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                                        <div className="flex items-center gap-2 mb-6">
                                            <User className="w-5 h-5 text-teal-600" />
                                            <h3 className="text-lg font-bold text-slate-800">Patient Profile</h3>
                                        </div>
                                        <div className="grid grid-cols-2 gap-y-6 gap-x-8">
                                            <div>
                                                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Name</p>
                                                <p className="font-medium text-slate-800 text-lg">{patient?.name}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Age</p>
                                                <p className="font-medium text-slate-800 text-lg">{patient?.age || (patient?.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : "N/A")} years</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Gender</p>
                                                <p className="font-medium text-slate-800 text-lg">{patient?.gender}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Status</p>
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-sm font-medium">
                                                    <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                                                    Active Case
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Parsing Data Logic (Inline) */}
                                {(() => {
                                    // Parse Verification
                                    const verifyParts = (previewReport.verify || "").split(',');
                                    const status = verifyParts[0] || "Unknown";
                                    const verifyConf = Math.round(parseFloat(verifyParts[1]?.replace(/[^0-9.]/g, '')) || 0);
                                    const skinType = verifyParts[2] || "Unknown";
                                    const verifyRemark = verifyParts.slice(3).join(',') || "No remarks.";

                                    // Parse Prediction
                                    // Key fix: backend saves as 'prediction', not 'pred'
                                    const predParts = (previewReport.prediction || previewReport.pred || "").split(',');
                                    const condition = predParts[0] || "Unknown";
                                    const predConf = Math.round(parseFloat(predParts[1]?.replace(/[^0-9.]/g, '')) || 0);
                                    const predRemark = predParts.slice(2).join(',') || "No remarks.";

                                    return (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Verification Card */}
                                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div>
                                                        <h4 className="font-bold text-black mb-1">Verification</h4>
                                                        <p className="text-sm text-slate-600">Initial Assessment</p>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.trim().toLowerCase().includes('healthy') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-6 mb-6">
                                                    <CircularProgress value={verifyConf} label="Confidence" />
                                                    <div className="flex-1">
                                                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Skin Type</p>
                                                        <p className="font-bold text-black text-lg">{skinType}</p>
                                                    </div>
                                                </div>
                                                <div className="bg-slate-50 p-4 rounded-lg flex-1">
                                                    <p className="text-sm text-slate-900 leading-relaxed italic">"{verifyRemark}"</p>
                                                </div>
                                            </div>

                                            {/* AI Prediction Card */}
                                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div>
                                                        <h4 className="font-bold text-black mb-1">AI Diagnostics</h4>
                                                        <p className="text-sm text-slate-600">Deep Learning Analysis</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6 mb-6">
                                                    <CircularProgress value={predConf} color="text-indigo-600" label="Probability" />
                                                    <div className="flex-1">
                                                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">Detected Condition</p>
                                                        <p className="font-bold text-indigo-700 text-lg">{condition}</p>
                                                    </div>
                                                </div>
                                                <div className="bg-indigo-50 p-4 rounded-lg flex-1 border border-indigo-100">
                                                    <p className="text-sm text-indigo-900 leading-relaxed">
                                                        {predRemark.length > 150 ? predRemark.substring(0, 150) + "..." : predRemark}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}


                                {/* Detailed Report Section */}
                                <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100">
                                    <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                                        <Activity className="w-5 h-5 text-teal-600" />
                                        <h3 className="text-lg font-bold text-black">Detailed Medical Analysis</h3>
                                    </div>
                                    <div className="prose max-w-none text-black prose-headings:font-bold prose-headings:text-black prose-h2:text-teal-900 prose-h3:text-black prose-p:text-black prose-li:text-black prose-strong:text-black prose-ul:text-black prose-ol:text-black">
                                        <ReactMarkdown>
                                            {previewReport.report || "**No detailed report available.**"}
                                        </ReactMarkdown>
                                    </div>
                                </div>

                            </div>

                            {/* Footer / Actions */}
                            <div className="bg-white border-t border-slate-200 p-4 flex justify-between items-center shrink-0">
                                <p className="text-xs text-slate-400">Generated on {previewReport.timestamp && previewReport.timestamp._seconds ? new Date(previewReport.timestamp._seconds * 1000).toLocaleString() : "Unknown Date"}</p>
                                <button
                                    onClick={() => generatePDF(previewReport, patient)}
                                    className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-teal-600/20 flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4" /> Download PDF Report
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 font-sans text-sm text-slate-700 leading-relaxed prose prose-teal max-w-none">
                                                    <ReactMarkdown>{analysisResult.report}</ReactMarkdown>
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
        </Layout >
    );
}
