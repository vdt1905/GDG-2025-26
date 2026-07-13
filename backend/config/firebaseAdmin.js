const admin = require("firebase-admin");
const dotenv = require("dotenv");

dotenv.config();

let serviceAccount;

// 1. Prefer the env var (this is what production/Vercel uses).
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
        console.error("FIREBASE_SERVICE_ACCOUNT is set but is not valid JSON:", e.message);
        throw new Error(
            "FIREBASE_SERVICE_ACCOUNT must be a single-line minified JSON string. " +
            "Parsing failed — check for stray quotes/newlines in the Vercel env value."
        );
    }
} else {
    // 2. Fallback to a local key file for local development only.
    try {
        serviceAccount = require("../serviceAccountKey.json");
    } catch (e) {
        console.error("No FIREBASE_SERVICE_ACCOUNT env var and no serviceAccountKey.json file found.");
    }
}

if (!serviceAccount) {
    throw new Error(
        "Firebase Service Account missing. Set FIREBASE_SERVICE_ACCOUNT (minified JSON) " +
        "in your environment, or add backend/serviceAccountKey.json for local dev."
    );
}

// 3. Repair the private key: when the JSON is pasted into a hosting dashboard,
//    the "\n" line breaks are often stored as the literal characters "\" + "n".
//    admin.credential.cert() then fails with "Invalid PEM formatted message".
if (serviceAccount.private_key && serviceAccount.private_key.includes("\\n")) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
}

// 4. Guard against re-initialization on warm serverless invocations,
//    which would otherwise throw "The default Firebase app already exists".
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin Initialized");
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };
