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
        const admin = require("firebase-admin");

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
