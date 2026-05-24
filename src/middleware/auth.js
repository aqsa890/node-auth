import jwt from "jsonwebtoken";
import config from "../config/config.js";

function getBearerToken(req) {
	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
	return authHeader.slice("Bearer ".length);
}

export function optionalAuth(req, res, next) {
	const token = getBearerToken(req);
	if (!token) return next();

	try {
		const decoded = jwt.verify(token, config.JWT_SECRET);
		req.userId = decoded?.id;
		return next();
	} catch {
		return res.status(401).json({ message: "Invalid or expired token" });
	}
}

export function requireAuth(req, res, next) {
	const token = getBearerToken(req);
	if (!token) return res.status(401).json({ message: "Authorization token missing" });

	try {
		const decoded = jwt.verify(token, config.JWT_SECRET);
		req.userId = decoded?.id;
		return next();
	} catch {
		return res.status(401).json({ message: "Invalid or expired token" });
	}
}
