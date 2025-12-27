const cloudinary = require("cloudinary").v2;
const dotenv = require("dotenv");

dotenv.config();

console.log("Cloudinary Config Check:");
console.log("Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API Key:", process.env.CLOUDINARY_API_KEY ? "Present" : "Missing");
console.log("API Secret:", process.env.CLOUDINARY_API_SECRET ? "Present" : "Missing");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
