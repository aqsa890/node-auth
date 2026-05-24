import express from "express";

import {
	createMedia,
	deleteAllMedia,
	deleteMedia,
	getMedia,
	listMedia,
	updateMedia,
} from "../controllers/media.controller.js";
import { uploadSingleMedia } from "../middleware/upload.js";
import { optionalAuth, requireAuth } from "../middleware/auth.js";

const router = express.Router();

// If Authorization: Bearer <token> is provided, req.userId will be set.
router.use(optionalAuth);

function runUpload(req, res, next) {
	uploadSingleMedia(req, res, (err) => {
		if (err) return res.status(400).json({ message: err.message || "Upload failed" });
		// multer().any() -> files are in req.files; normalize to req.file
		if (!req.file && Array.isArray(req.files) && req.files.length > 0) {
			req.file = req.files[0];
		}
		return next();
	});
}

router.get("/", listMedia);
// Alias for clients that want an explicit endpoint
router.get("/getAll", listMedia);
router.get("/:id", getMedia);

// Create (upload) a new image/video
router.post("/", runUpload, createMedia);
// Alias for clients that use /runUpload
router.post("/runUpload", runUpload, createMedia);

// Update (replace) an existing image/video
router.put("/:id", runUpload, updateMedia);

// Delete all media for the current user (requires Authorization: Bearer <token>)
router.delete("/", requireAuth, deleteAllMedia);
router.delete("/deleteAll", requireAuth, deleteAllMedia);

router.delete("/:id", deleteMedia);

export default router;

