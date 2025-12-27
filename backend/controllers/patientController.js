const { db } = require("../config/firebaseAdmin");
const cloudinary = require("../config/cloudinaryConfig");

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

module.exports = {
    getPatients,
    createPatient,
    getPatientById,
    addPatientImage
};
