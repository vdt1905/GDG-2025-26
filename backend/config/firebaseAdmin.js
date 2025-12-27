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
    console.error("ERROR: No service account credentials found. Please place 'serviceAccountKey.json' in the backend folder.");
    // We don't exit process here to allow the server to start even if broken, 
    // but in production we should.
} else {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin Initialized");
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
