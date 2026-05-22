import UserModel from "../models/user.model.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import config from "../config/config.js";

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

        res.cookie("refreshToken", refreshtoken, {
            httpOnly: true,
            secure: true,
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
            return res.status(401).json({ message: "Authorizati on token missing" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, config.JWT_SECRET);
        const userId = decoded?.id;
        if (!userId) {
            return res.status(401).json({ message: "Invalid token payload" });
        }

        const user = await UserModel.findById(userId).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({ user });
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}
    export async function refreshToken(req, res) {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token missing" });
        }
        const decoded = jwt.verify(refreshToken, config.JWT_SECRET);
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

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days       
        }
        )
        return res.status(200).json({ token: accessToken });
}