const { db } = require("../config/firebaseAdmin");
const cloudinary = require("../config/cloudinaryConfig");

// Get Doctor Profile
const getProfile = async (req, res) => {
    try {
        const doctorId = req.user.uid;
        const docRef = db.collection("doctors").doc(doctorId);
        const docSnap = await docRef.get();

        if (!docSnap.exists) {
            // Return basic info from auth token if no profile exists yet
            return res.json({
                name: req.user.name || "Doctor",
                email: req.user.email,
                specialization: "General Dermatologist",
                clinicName: "My Clinic",
                profileImage: req.user.picture || ""
            });
        }

        res.json(docSnap.data());
    } catch (error) {
        console.error("Error fetching doctor profile:", error);
        res.status(500).json({ error: error.message });
    }
};

// Create Doctor Profile
// This is the one place a doctor document is created. POST creates, PUT updates.
// The document ID is the Firebase Auth UID from the verified token, so a doctor
// can only ever create their own profile.
const createProfile = async (req, res) => {
    try {
        const doctorId = req.user.uid;
        const docRef = db.collection("doctors").doc(doctorId);

        // Creating twice is a client mistake, so say so instead of overwriting.
        const existing = await docRef.get();
        if (existing.exists) {
            return res.status(409).json({
                message: "Profile already exists. Use PUT /api/doctors/profile to update it.",
                ...existing.data()
            });
        }

        const { name, specialization, clinicName, phone } = req.body;
        const now = new Date().toISOString();

        const profileData = {
            name: name || req.user.name || "Doctor",
            // Email and photo come from the verified token, not the request body,
            // so they always match the real account.
            email: req.user.email || "",
            profileImage: req.user.picture || "",
            specialization: specialization || "General Dermatologist",
            clinicName: clinicName || "My Clinic",
            phone: phone || "",
            createdAt: now,
            updatedAt: now
        };

        await docRef.set(profileData);

        console.log("Created doctor profile for:", doctorId);
        res.status(201).json({ message: "Doctor profile created", id: doctorId, ...profileData });
    } catch (error) {
        console.error("Error creating doctor profile:", error);
        res.status(500).json({ error: error.message });
    }
};

// Update Doctor Profile
const updateProfile = async (req, res) => {
    try {
        const doctorId = req.user.uid;
        const { name, specialization, clinicName, phone, email } = req.body;
        let profileImage = req.body.existingImage || "";

        if (req.file) {
            try {
                const uploadResult = await new Promise((resolve, reject) => {
                    const stream = cloudinary.uploader.upload_stream(
                        {
                            folder: "shushrut_doctors",
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
            } catch (err) {
                console.error("Doctor image upload failed:", err);
            }
        }

        const profileData = {
            name,
            specialization,
            clinicName,
            phone,
            email,
            profileImage,
            updatedAt: new Date().toISOString()
        };

        await db.collection("doctors").doc(doctorId).set(profileData, { merge: true });

        res.json({ message: "Profile updated successfully", ...profileData });
    } catch (error) {
        console.error("Error updating doctor profile:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getProfile,
    createProfile,
    updateProfile
};
