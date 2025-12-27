const express = require("express");
const verifyToken = require("../middleware/authMiddleware");
const { getPatients, createPatient, getPatientById } = require("../controllers/patientController");

const upload = require("../middleware/uploadMiddleware");

const router = express.Router();

router.use(verifyToken);

router.get("/", getPatients);
router.post("/",
    upload.single("image"),
    (req, res, next) => {
        console.log("MiddleWare Log - Request Body:", req.body);
        console.log("MiddleWare Log - Request File:", req.file ? "File found" : "No file found");
        next();
    },
    createPatient
);
router.post("/:id/images", upload.single("image"), require("../controllers/patientController").addPatientImage);
router.post("/analyze", require("../controllers/patientController").analyzeSkinImage);
router.delete("/:id/images", require("../controllers/patientController").deletePatientImage);
router.delete("/:id", require("../controllers/patientController").deletePatient);
router.get("/:id", getPatientById);

module.exports = router;
