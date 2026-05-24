import fs from "node:fs/promises";
import crypto from "node:crypto";

import MediaModel from "../models/media.model.js";
import { getCloudinary } from "../config/cloudinary.js";

function sanitizePathSegment(value) {
	return String(value || "")
		.trim()
		.replace(/[^a-zA-Z0-9_-]/g, "_")
		.slice(0, 200) || "anonymous";
}

async function safeUnlink(filePath) {
	if (!filePath) return;
	try {
		await fs.unlink(filePath);
	} catch {
		// ignore
	}
}

export async function createMedia(req, res) {
	let cloudinary;
	try {
		cloudinary = getCloudinary();
	} catch (err) {
		return res.status(500).json({ message: err.message });
	}

	const file = req.file;
	if (!file) return res.status(400).json({ message: "No file uploaded" });

	try {
		const userId = sanitizePathSegment(req.userId || req.body?.userId);
		const fileId = crypto.randomUUID();
		const folder = `Home/Gallery/${userId}`;

		const result = await cloudinary.uploader.upload(file.path, {
			resource_type: "auto",
			folder,
			public_id: fileId,
		});

		const media = await MediaModel.create({
			url: result.secure_url,
			public_id: result.public_id,
			ownerId: userId,
			folder,
			fileId,
			mediaType: result.resource_type === "video" ? "video" : "image",
		});

		return res.status(201).json(media);
	} catch (error) {
		return res.status(500).json({ message: "Error uploading media" });
	} finally {
		await safeUnlink(file.path);
	}
}

export async function listMedia(_req, res) {
	try {
		const media = await MediaModel.find({}).sort({ createdAt: -1 });
		return res.status(200).json(media);
	} catch {
		return res.status(500).json({ message: "Error fetching media" });
	}
}

export async function getMedia(req, res) {
	try {
		const media = await MediaModel.findById(req.params.id);
		if (!media) return res.status(404).json({ message: "Media not found" });
		return res.status(200).json(media);
	} catch {
		return res.status(400).json({ message: "Invalid media id" });
	}
}

export async function updateMedia(req, res) {
	let cloudinary;
	try {
		cloudinary = getCloudinary();
	} catch (err) {
		return res.status(500).json({ message: err.message });
	}

	const file = req.file;
	if (!file) return res.status(400).json({ message: "No file uploaded" });

	try {
		const media = await MediaModel.findById(req.params.id);
		if (!media) return res.status(404).json({ message: "Media not found" });

		const ownerId = sanitizePathSegment(media.ownerId || req.userId || req.body?.userId);
		const fileId = media.fileId || (media.public_id ? media.public_id.split("/").pop() : crypto.randomUUID());
		const folder = media.folder || `Home/Gallery/${ownerId}`;
		const desiredPublicId = `${folder}/${fileId}`;

		await cloudinary.uploader.destroy(media.public_id, {
			resource_type: media.mediaType === "video" ? "video" : "image",
		});

		const result = await cloudinary.uploader.upload(file.path, {
			resource_type: "auto",
			folder,
			public_id: fileId,
			overwrite: true,
		});

		media.url = result.secure_url;
		media.public_id = result.public_id || desiredPublicId;
		media.mediaType = result.resource_type === "video" ? "video" : "image";
		media.ownerId = ownerId;
		media.folder = folder;
		media.fileId = fileId;
		await media.save();

		return res.status(200).json(media);
	} catch {
		return res.status(500).json({ message: "Error updating media" });
	} finally {
		await safeUnlink(file.path);
	}
}

export async function deleteMedia(req, res) {
	let cloudinary;
	try {
		cloudinary = getCloudinary();
	} catch (err) {
		return res.status(500).json({ message: err.message });
	}

	try {
		const media = await MediaModel.findById(req.params.id);
		if (!media) return res.status(404).json({ message: "Media not found" });

		await cloudinary.uploader.destroy(media.public_id, {
			resource_type: media.mediaType === "video" ? "video" : "image",
		});
		await MediaModel.deleteOne({ _id: media._id });

		return res.status(200).json({ message: "Media deleted successfully" });
	} catch {
		return res.status(500).json({ message: "Error deleting media" });
	}
}

export async function deleteAllMedia(req, res) {
	let cloudinary;
	try {
		cloudinary = getCloudinary();
	} catch (err) {
		return res.status(500).json({ message: err.message });
	}

	const ownerId = req.userId;
	if (!ownerId) return res.status(401).json({ message: "Authorization token missing" });

	try {
		const media = await MediaModel.find({ ownerId });
		if (media.length === 0) return res.status(200).json({ message: "No media to delete", deleted: 0 });

		const results = await Promise.allSettled(
			media.map((m) =>
				cloudinary.uploader.destroy(m.public_id, {
					resource_type: m.mediaType === "video" ? "video" : "image",
				})
			)
		);

		const cloudinaryDeleted = results.filter((r) => r.status === "fulfilled").length;
		await MediaModel.deleteMany({ ownerId });

		return res.status(200).json({
			message: "All media deleted successfully",
			deleted: media.length,
			cloudinaryDeleted,
		});
	} catch {
		return res.status(500).json({ message: "Error deleting all media" });
	}
}
