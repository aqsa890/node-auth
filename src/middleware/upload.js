import fs from "node:fs";
import path from "node:path";
import multer from "multer";

const tmpDir = path.join(process.cwd(), "tmp", "uploads");
fs.mkdirSync(tmpDir, { recursive: true });

const storage = multer.diskStorage({
	destination: (_req, _file, cb) => cb(null, tmpDir),
	filename: (_req, file, cb) => {
		const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
		const ext = path.extname(file.originalname || "");
		cb(null, `${unique}${ext}`);
	},
});

function fileFilter(_req, file, cb) {
	const type = file?.mimetype || "";
	const ok = type.startsWith("image/") || type.startsWith("video/");
	if (!ok) return cb(new Error("Only image/* or video/* files are allowed"));
	return cb(null, true);
}

export const uploadSingleMedia = multer({
	storage,
	fileFilter,
	limits: {
		fileSize: 50 * 1024 * 1024, // 50MB
	},
}).any();
