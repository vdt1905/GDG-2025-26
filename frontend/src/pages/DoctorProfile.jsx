import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import api from "../lib/axios";
import { User, Save, Loader2, Camera, Building, Phone, Mail, Stethoscope } from "lucide-react";
import useAuthStore from "../store/authStore";
import React from "react";
export default function DoctorProfile() {
    const { currentUser } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        specialization: "",
        clinicName: "",
        phone: "",
        profileImage: ""
    });
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [message, setMessage] = useState({ type: "", text: "" });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get("/doctors/profile");
            setFormData(res.data);
            if (res.data.profileImage) {
                setPreviewUrl(res.data.profileImage);
            }
        } catch (err) {
            console.error("Error fetching profile:", err);
        } finally {
            setLoading(false);
        }
    };

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
        setSaving(true);
        setMessage({ type: "", text: "" });

        try {
            const data = new FormData();
            data.append("name", formData.name);
            data.append("specialization", formData.specialization);
            data.append("clinicName", formData.clinicName);
            data.append("phone", formData.phone);
            data.append("email", formData.email);
            data.append("existingImage", formData.profileImage); // Keep old image if no new one

            if (imageFile) {
                data.append("image", imageFile);
            }

            const res = await api.put("/doctors/profile", data);

            // Update local state with response (might contain new image URL)
            setFormData(prev => ({ ...prev, ...res.data }));
            setMessage({ type: "success", text: "Profile updated successfully!" });
        } catch (err) {
            console.error("Error updating profile:", err);
            setMessage({ type: "error", text: "Failed to update profile." });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Layout><div className="p-20 text-center"><Loader2 className="animate-spin m-auto" /></div></Layout>;

    return (
        <Layout>
            <div className="max-w-4xl mx-auto animate-fade-in">
                <h1 className="text-3xl font-bold text-slate-800 mb-2">My Profile</h1>
                <p className="text-slate-500 mb-8">Manage your account settings and clinic details.</p>

                {message.text && (
                    <div className={`p-4 mb-6 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Image & Basic Info */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="glass-panel p-6 rounded-xl shadow-lg border-t-4 border-teal-500 text-center">
                            <div className="relative w-32 h-32 mx-auto mb-4 group cursor-pointer">
                                <div className="w-full h-full rounded-full overflow-hidden border-4 border-slate-100 shadow-sm">
                                    {previewUrl ? (
                                        <img src={previewUrl} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
                                            <User className="w-12 h-12" />
                                        </div>
                                    )}
                                </div>
                                <label className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <Camera className="w-6 h-6" />
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                                </label>
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">{formData.name || "Doctor"}</h2>
                            <p className="text-teal-600 font-medium text-sm">{formData.specialization || "Dermatologist"}</p>
                        </div>
                    </div>

                    {/* Right Column: Edit Form */}
                    <div className="lg:col-span-2">
                        <div className="glass-panel p-8 rounded-xl shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div className="col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                        <input
                                            type="text"
                                            name="name"
                                            className="w-full pl-10 p-2.5 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                                            value={formData.name}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Specialization</label>
                                    <div className="relative">
                                        <Stethoscope className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                        <input
                                            type="text"
                                            name="specialization"
                                            className="w-full pl-10 p-2.5 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                                            value={formData.specialization}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Clinic Name</label>
                                    <div className="relative">
                                        <Building className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                        <input
                                            type="text"
                                            name="clinicName"
                                            className="w-full pl-10 p-2.5 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                                            value={formData.clinicName}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                        <input
                                            type="email"
                                            name="email"
                                            disabled // Email usually shouldn't be changed easily in this flow
                                            className="w-full pl-10 p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-slate-500 cursor-not-allowed"
                                            value={formData.email}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                        <input
                                            type="tel"
                                            name="phone"
                                            className="w-full pl-10 p-2.5 rounded-lg border border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                                            value={formData.phone}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {saving ? <Loader2 className="animate-spin" /> : <Save className="w-5 h-5" />}
                                {saving ? "Saving Changes..." : "Save Profile"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </Layout>
    );
}
