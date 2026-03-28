const admin = require("firebase-admin");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

let serviceAccount;

try {
    // Try to load from file first
    serviceAccount = require("../serviceAccountKey.json");
} catch (e) {
    console.log("serviceAccountKey.json not found, attempting to use env vars...");
    // Fallback to Env Vars if file not present (helpful for deployment sometimes)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    }
}

if (!serviceAccount) {
    console.error("CRITICAL ERROR: No service account credentials found. Set FIREBASE_SERVICE_ACCOUNT in your Vercel Environment Variables as a minified JSON string.");
    throw new Error("Firebase Service Account missing or invalid. Check your Vercel env variable.");
} else {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin Initialized");
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
