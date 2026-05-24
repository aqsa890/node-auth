import cloudinary from "cloudinary";

let isConfigured = false;
let cloudinaryClient = null;

function parseCloudinaryUrl(cloudinaryUrl) {
	try {
		const url = new URL(cloudinaryUrl);
		if (url.protocol !== "cloudinary:") return null;

		const cloud_name = url.hostname;
		const api_key = decodeURIComponent(url.username || "");
		const api_secret = decodeURIComponent(url.password || "");

		if (!cloud_name || !api_key || !api_secret) return null;
		return { cloud_name, api_key, api_secret };
	} catch {
		return null;
	}
}

export function getCloudinary() {
	if (!isConfigured) {
		if (process.env.NODE_ENV === "test" && process.env.CLOUDINARY_USE_REAL !== "1") {
			// Local mock for tests: avoids external dependency and flakiness.
			cloudinaryClient = {
				uploader: {
					async upload(filePath, options = {}) {
						const folder = options.folder || "Home/Gallery/anonymous";
						const publicId = options.public_id || "test-file";
						const ext = String(filePath || "").split(".").pop()?.toLowerCase();
						const resource_type = ext === "mp4" || ext === "mov" ? "video" : "image";
						return {
							secure_url: `https://example.test/${folder}/${publicId}`,
							public_id: `${folder}/${publicId}`,
							resource_type,
						};
					},
					async destroy(_publicId, _options = {}) {
						return { result: "ok" };
					},
				},
			};
			isConfigured = true;
			return cloudinaryClient;
		}

		const {
			CLOUD_NAME,
			CLOUDINARY_API_KEY,
			CLOUDINARY_API_SECRET,
			CLOUDINARY_URL,
		} = process.env;

		const fromUrl = CLOUDINARY_URL ? parseCloudinaryUrl(CLOUDINARY_URL) : null;
		const cloud_name = CLOUD_NAME || fromUrl?.cloud_name;
		const api_key = CLOUDINARY_API_KEY || fromUrl?.api_key;
		const api_secret = CLOUDINARY_API_SECRET || fromUrl?.api_secret;

		if (!cloud_name || !api_key || !api_secret) {
			throw new Error(
				"Cloudinary is not configured. Set CLOUDINARY_URL or set CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET."
			);
		}

		cloudinary.v2.config({ cloud_name, api_key, api_secret });

		cloudinaryClient = cloudinary.v2;
		isConfigured = true;
	}

	return cloudinaryClient;
}
