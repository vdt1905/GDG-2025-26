const express = require("express");
const dotenv = require("dotenv");

const patientRoutes = require("./routes/patientRoutes");
const doctorRoutes = require("./routes/doctorRoutes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 🔥 CORS FIX (Vercel-safe)
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "https://shushrutai.vercel.app");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // 🔥 Handle preflight requests
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    next();
});

// Middleware
app.use(express.json());

// Routes
app.use("/api/patients", patientRoutes);
app.use("/api/doctors", doctorRoutes);

// Test route
app.get("/", (req, res) => {
    res.send("Shushrut API is running 🚀");
});

// Start server (local only; Vercel ignores this)
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;