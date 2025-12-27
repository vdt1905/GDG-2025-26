const express = require("express");
const { getProfile, updateProfile } = require("../controllers/doctorController");
const verifyToken = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.use(verifyToken);

router.get("/profile", getProfile);
router.put("/profile",
    upload.single("image"),
    (req, res, next) => {
        console.log("Doctor Profile Update - Body:", req.body);
        console.log("Doctor Profile Update - File:", req.file ? "File found" : "No file found");
        next();
    },
    updateProfile
);

module.exports = router;
