const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const patientRoutes = require("./routes/patientRoutes");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
    origin: [
        "https://shushrutai.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
};

app.use(cors(corsOptions));

// 🔥 IMPORTANT: handle preflight properly
app.options("*", cors(corsOptions));
app.use(express.json());

// Routes
// Routes
app.use("/api/patients", patientRoutes);
app.use("/api/doctors", require("./routes/doctorRoutes"));

app.get("/", (req, res) => {
    res.send("Shushrut API is running");
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;
