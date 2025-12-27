import { useState } from "react";
import Layout from "../components/Layout";
import api from "../lib/axios";
import { useNavigate } from "react-router-dom";
import { Upload, Loader2, Save } from "lucide-react";
import React from "react";
export default function RegisterPatient() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        dob: "",
        gender: "Female", // Default
        bloodGroup: "O+", // Default
        email: "",
        phone: "",
        history: "",
    });
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [error, setError] = useState("");

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const data = new FormData();
            data.append("name", formData.name);
            data.append("dob", formData.dob);
            data.append("gender", formData.gender);
            data.append("bloodGroup", formData.bloodGroup);
            data.append("email", formData.email);
            data.append("phone", formData.phone);
            data.append("history", formData.history);

            if (imageFile) {
                data.append("image", imageFile);
            }

            await api.post("/patients", data);

            navigate("/patients");
        } catch (err) {
            console.error("Error adding patient: ", err);
            // Axios error handling
            const message = err.response?.data?.error || err.message || "Failed to register patient";
            setError("Failed to register patient: " + message);
        }
        setLoading(false);
    };

    return (
        <Layout>
            <div className="max-w-3xl mx-auto animate-fade-in">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">Register Transact</h1>
                <p className="text-slate-500 mb-8">Add a new patient to your records.</p>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="glass-panel p-8 rounded-xl shadow-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                            <input
                                type="text"
                                name="name"
                                required
                                className="w-full p-2.5 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none text-slate-900 placeholder:text-slate-400 bg-white"
                                value={formData.name}
                                onChange={handleChange}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Date of Birth</label>
                            <input
                                type="date"
                                name="dob"
                                required
                                className="w-full p-2.5 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none text-slate-900 placeholder:text-slate-400 bg-white"
                                value={formData.dob}
                                onChange={handleChange}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Blood Group</label>
                            <select
                                name="bloodGroup"
                                className="w-full p-2.5 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none text-slate-900 placeholder:text-slate-400 bg-white"
                                value={formData.bloodGroup}
                                onChange={handleChange}
                            >
                                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(bg => (
                                    <option key={bg} value={bg}>{bg}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Gender</label>
                            <select
                                name="gender"
                                className="w-full p-2.5 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none text-slate-900 placeholder:text-slate-400 bg-white"
                                value={formData.gender}
                                onChange={handleChange}
                            >
                                <option value="Female">Female</option>
                                <option value="Male">Male</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Email</label>
                            <input
                                type="email"
                                name="email"
                                className="w-full p-2.5 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none text-slate-900 placeholder:text-slate-400 bg-white"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Phone</label>
                            <input
                                type="tel"
                                name="phone"
                                className="w-full p-2.5 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none text-slate-900 placeholder:text-slate-400 bg-white"
                                value={formData.phone}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Medical History / Initial Notes</label>
                            <textarea
                                name="history"
                                rows="3"
                                className="w-full p-2.5 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none text-slate-900 placeholder:text-slate-400 bg-white"
                                value={formData.history}
                                onChange={handleChange}
                            ></textarea>
                        </div>
                    </div>

                    <div className="mb-8 ">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Patient Image</label>
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors relative cursor-pointer">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />

                            {previewUrl ? (
                                <div className="relative h-48 mx-auto w-full max-w-sm">
                                    <img src={previewUrl} alt="Preview" className="h-full w-full object-contain rounded-lg" />
                                    <p className="mt-2 text-xs text-slate-500">Click to change</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <Upload className="w-10 h-10 text-slate-400 mb-2" />
                                    <p className="text-sm text-slate-600 font-medium">Click to upload or drag and drop</p>
                                    <p className="text-xs text-slate-400 mt-1">SVG, PNG, JPG or GIF (max. 5MB)</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <Save className="w-5 h-5" />}
                        {loading ? "Registering..." : "Register Patient"}
                    </button>
                </form>
            </div>
        </Layout>
    );
}
