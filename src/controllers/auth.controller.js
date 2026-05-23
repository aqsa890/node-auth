import UserModel from "../models/user.model.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import sessionModel from "../models/session.model.js";

export async function register(req, res) {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: "username, email, and password are required" });
        }

        const isAlreadyRegistered = await UserModel.findOne({
            $or: [{ email }, { username }]
        });

        if (isAlreadyRegistered) {
            return res.status(409).json({ message: "User or email already exists" });
        }

        const hashedPassword = crypto
            .createHash("sha256")
            .update(password)
            .digest("hex");

        const user = await UserModel.create({
            username,
            email,
            password: hashedPassword
        });

        const token = jwt.sign(
            { id: user._id.toString() },
            config.JWT_SECRET,
            { expiresIn: "1d" }
        );

        const refreshtoken = jwt.sign(
            { id: user._id.toString() },
            config.JWT_SECRET,
            { expiresIn: "7d" }
        );

        const refreshTokenHash = crypto
            .createHash("sha256")
            .update(refreshtoken)
            .digest("hex");

        const session = await sessionModel.create({
            userId: user._id,
            refreshTokenHash,
            ip: req.ip,
            userAgent: req.get("user-agent") ?? "unknown"
        })

        res.cookie("refreshToken", refreshtoken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days       
        }
        )

        return res.status(201).json({
            message: "User registered successfully",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error("Register error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }

}

export async function getMe(req, res) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Authorization token missing" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, config.JWT_SECRET);
        return res.status(200).json({ decoded });
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}
    export async function refreshToken(req, res) {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token missing" });
        }
        let decoded;
        try {
            decoded = jwt.verify(refreshToken, config.JWT_SECRET);
        } catch {
            return res.status(401).json({ message: "Invalid or expired refresh token" });
        }

const refreshTokenHash = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        const session = await sessionModel.findOne({ refreshTokenHash, revoked: false });

        if (!session) {
            return res.status(401).json({ message: "Invalid refresh token" });
        }

        const accessToken = jwt.sign(
            { id: decoded.id },
            config.JWT_SECRET,
            { expiresIn: "15m" }
        )

        const newRefreshToken = jwt.sign(
            { id: decoded.id },
            config.JWT_SECRET,
            { expiresIn: "7d" }
        )

        const newRefreshTokenHash = crypto
            .createHash("sha256")
            .update(newRefreshToken)
            .digest("hex");

        await sessionModel.updateOne(
            { _id: session._id },
            { $set: { refreshTokenHash: newRefreshTokenHash } }
        );

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days       
        }
        )
        return res.status(200).json({ token: accessToken });
}

export async function logout(req, res) {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(400).json({ message: "Refresh token missing" });
        }

        try {
            jwt.verify(refreshToken, config.JWT_SECRET);
        } catch {
            res.clearCookie("refreshToken");
            return res.status(401).json({ message: "Invalid or expired refresh token" });
        }

        const refreshTokenHash = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        const session = await sessionModel.findOne({ refreshTokenHash, revoked: false });

        if (!session) {
            return res.status(400).json({ message: "Invalid refresh token" });
        }
        await sessionModel.updateOne(
            { _id: session._id },
            { $set: { revoked: true } }
        );

        res.clearCookie("refreshToken");
        return res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.error("Logout error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}       