const { auth } = require("../config/firebaseAdmin");

const verifyToken = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }

    try {
        const decodedToken = await auth.verifyIdToken(token);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error("Error verifying token:", error);
        return res.status(403).json({ message: "Unauthorized", error: error.message });
    }
};

module.exports = verifyToken;
