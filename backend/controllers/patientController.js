const { db } = require("../config/firebaseAdmin");
const cloudinary = require("../config/cloudinaryConfig");
const axios = require('axios');

// Get all patients for the logged-in doctor
const getPatients = async (req, res) => {
    try {
        const doctorId = req.user.uid;
        console.log("Fetching patients for Doctor ID:", doctorId);

        const snapshot = await db.collection("patients")
            .where("createdBy", "==", doctorId)
            .get();

        console.log("Found patient docs:", snapshot.empty ? 0 : snapshot.docs.length);

        let patients = snapshot.docs.map(doc => {
            const data = doc.data();
            console.log(`- Patient: ${data.name}, CreatedBy: ${data.createdBy || data.doctordId || 'MISSING'}`);
            return { id: doc.id, ...data };
        });

        // Sort by createdAt descending (ISO strings compare correctly lexicographically)
        patients.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

        res.json(patients);
    } catch (error) {
        console.error("Error fetching patients:", error);
        res.status(500).json({ error: error.message });
    }
};

// Create a new patient
const createPatient = async (req, res) => {
    try {
        const doctorId = req.user.uid;
        console.log("Creating patient with body:", req.body);
        const { name, dob, gender, bloodGroup, email, phone, history } = req.body;
        let profileImage = "";
        let profilePublicId = "";

        // Upload to Cloudinary if file exists
        if (req.file) {
            try {
                // Use a Promise wrapper to handle the stream upload
                const uploadResult = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        {
                            folder: "shushrut_patients",
                            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                            api_key: process.env.CLOUDINARY_API_KEY,
                            api_secret: process.env.CLOUDINARY_API_SECRET,
                        },
                        (error, result) => {
                            if (error) reject(error);
                            else resolve(result);
                        }
                    );
                    stream.end(req.file.buffer);
                });
                profileImage = uploadResult.secure_url;
                profilePublicId = uploadResult.public_id;
            } catch (uploadError) {
                console.error("Image upload failed:", uploadError);
                // Continue without image if upload fails, or handle as needed
            }
        }

        const now = new Date().toISOString();
        const caseId = `CASE-${Date.now()}`;

        const newPatient = {
            name: name || "Unknown",
            dob: dob || null,
            gender: gender || "Other",
            bloodGroup: bloodGroup || "Unknown",
            email: email || "",
            phone: phone || "",
            history: history || "",
            profileImage,     // Will be "" if no file or upload failed
            profilePublicId,  // Will be "" if no file or upload failed
            skinImages: [],
            caseId,
            createdBy: doctorId,
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await db.collection("patients").add(newPatient);
        res.status(201).json({ id: docRef.id, ...newPatient });
    } catch (error) {
        console.error("Error adding patient:", error);
        res.status(500).json({ error: error.message });
    }
};

// Get single patient
const getPatientById = async (req, res) => {
    try {
        const docRef = db.collection("patients").doc(req.params.id);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            return res.status(404).json({ error: "Patient not found" });
        }

        res.json({ id: docSnap.id, ...docSnap.data() });
    } catch (error) {
        console.error("Error fetching patient details:", error);
        res.status(500).json({ error: error.message });
    }
};

const admin = require("firebase-admin"); // Ensure admin is available for FieldValue

// Add image to patient's skinImages array
const addPatientImage = async (req, res) => {
    try {
        const { id } = req.params;
        let imageUrl = "";

        if (!req.file) {
            return res.status(400).json({ error: "No image file provided" });
        }

        try {
            const uploadResult = await new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        folder: "shushrut_patients_gallery",
                        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                        api_key: process.env.CLOUDINARY_API_KEY,
                        api_secret: process.env.CLOUDINARY_API_SECRET,
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                stream.end(req.file.buffer);
            });
            imageUrl = uploadResult.secure_url;
        } catch (uploadError) {
            console.error("Gallery image upload failed:", uploadError);
            return res.status(500).json({ error: "Image upload failed" });
        }

        // Update Firestore
        const docRef = db.collection("patients").doc(id);

        await docRef.update({
            skinImages: admin.firestore.FieldValue.arrayUnion(imageUrl),
            updatedAt: new Date().toISOString()
        });

        res.json({ message: "Image added successfully", imageUrl });
    } catch (error) {
        console.error("Error adding patient image:", error);
        res.status(500).json({ error: error.message });
    }
};

// Analyze skin image (Real AI via Python Service)
const analyzeSkinImage = async (req, res) => {
    try {
        const { patientId, imageUrl } = req.body;

        console.log("Analyzing for patient:", patientId);
        if (imageUrl) console.log("Specific Image URL provided:", imageUrl);

        if (!patientId) {
            return res.status(400).json({ error: "Patient ID is required for analysis" });
        }

        // Call Python Service
        const payload = { obj_id: patientId };
        if (imageUrl) payload.imageUrl = imageUrl;

        const pythonResponse = await axios.post('http://127.0.0.1:6700/predict', payload);

        const pythonData = pythonResponse.data;

        // Python returns: 
        // { prediction: "Disease,Confidence,Remarks", report: "Markdown...", ... }

        // Parse Prediction String
        const predParts = pythonData.prediction.split(',');
        let diagnosis = "Unknown";
        let confidence = "0";
        let remarks = "";

        if (predParts.length >= 2) {
            diagnosis = predParts[0].trim();
            confidence = predParts[1].trim().replace('%', '');
            remarks = predParts.slice(2).join(',').trim();
        }

        // Send response merging Python data with what frontend expects
        res.json({
            diagnosis: diagnosis,
            confidence: (parseFloat(confidence) / 100).toFixed(2), // Normalize to 0-1 if frontend expects that, or keep as %
            severity: "Check Report", // Python doesn't return severity in CSV, so we refer to report
            report: pythonData.report,
            jarvis_notes: pythonData.jarvis,
            // Critical passthrough fields for Preview Modal:
            verify: pythonData.verify,
            prediction: pythonData.prediction,
            imageUrl: pythonData.imageUrl,
            timestamp: { _seconds: Math.floor(Date.now() / 1000) } // Fake Firestore timestamp format for consistency
        });

    } catch (error) {
        console.error("Analysis failed:", error.message);
        if (error.response) {
            console.error("Python Server Error:", error.response.data);
            return res.status(error.response.status).json({ error: "AI Service Error: " + JSON.stringify(error.response.data) });
        }
        res.status(500).json({ error: "Failed to analyze image" });
    }
};

// Delete a patient
const deletePatient = async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection("patients").doc(id).delete();
        res.json({ message: "Patient deleted successfully" });
    } catch (error) {
        console.error("Error deleting patient:", error);
        res.status(500).json({ error: error.message });
    }
};

// Delete a specific image from patient gallery
const deletePatientImage = async (req, res) => {
    try {
        const { id } = req.params;
        const imageUrl = req.body.imageUrl || req.query.imageUrl;

        console.log(`Attempting to delete image for patient ${id}. URL: ${imageUrl}`);

        if (!imageUrl) {
            return res.status(400).json({ error: "Image URL is required" });
        }

        const docRef = db.collection("patients").doc(id);
        await docRef.update({
            skinImages: admin.firestore.FieldValue.arrayRemove(imageUrl)
        });

        res.json({ message: "Image deleted successfully" });
    } catch (error) {
        console.error("Error deleting image:", error);
        res.status(500).json({ error: error.message });
    }
};

// Get Patient Reports
const getPatientReports = async (req, res) => {
    try {
        const { id } = req.params;
        const reportsRef = db.collection("patients").doc(id).collection("reports");
        const snapshot = await reportsRef.orderBy("timestamp", "desc").get();

        const reports = [];
        snapshot.forEach((doc) => {
            reports.push({ id: doc.id, ...doc.data() });
        });

        res.status(200).json(reports);
    } catch (error) {
        res.status(500).json({ message: "Error fetching reports", error: error.message });
    }
};

module.exports = {
    getPatients,
    createPatient,
    getPatientById,
    addPatientImage,
    analyzeSkinImage,
    deletePatient,
    deletePatientImage,
    getPatientReports
};

