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
    updateProfile
};
