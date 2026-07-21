const router = require("express").Router();
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const auth = require("../middleware/auth");
const authorize = require("../middleware/authorize");

// Configure multer for file uploads
const storage = multer.diskStorage({});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});


router.post("/upload",auth,authorize(["admin"]), upload.single("image"), async (req, res) => {
    try {
        // Multer populates req.file with the uploaded file data
        if (!req.file) {
            return res.status(400).json({ error: "No file was received." });
        }


        // req.file.path contains the local path to the temporary file
        const uploadResult = await cloudinary.uploader.upload(req.file.path, {
            folder: "iyf", 
        });

        // Return the secure URL back to the frontend
        res.json({ url: uploadResult.secure_url });
    } catch (error) {
        console.error("Error uploading image to Cloudinary:", error);
        res.status(500).json({ error: "Failed to upload image" });
    }
});

module.exports = router;