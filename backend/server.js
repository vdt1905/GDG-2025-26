const express = require("express");
const dotenv = require("dotenv");

const patientRoutes = require("./routes/patientRoutes");
const doctorRoutes = require("./routes/doctorRoutes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// 🔥 CORS FIX (Vercel-safe)
// Configure allowed origins via CORS_ORIGIN env var (comma-separated).
// Falls back to the production frontend if unset.
const allowedOrigins = (process.env.CORS_ORIGIN || "https://shushrutai.vercel.app")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

// Any localhost / 127.0.0.1 origin (any port) is allowed for local development.
const isLocalhost = (origin) =>
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || "");

app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (allowedOrigins.includes(origin) || isLocalhost(origin))) {
        res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
        res.setHeader("Access-Control-Allow-Origin", allowedOrigins[0]);
    }
    res.setHeader("Vary", "Origin");
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

// Start a real HTTP listener ONLY when running locally / on a normal server.
// On Vercel the file is imported as a serverless handler, so calling
// app.listen() there can crash the function — skip it when VERCEL is set.
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

module.exports = app;