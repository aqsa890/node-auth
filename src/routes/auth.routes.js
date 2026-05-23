import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";

const authRouter = Router();

authRouter.post("/register", authController.register);
authRouter.get("/get-me", authController.getMe);
authRouter.post("/refresh-token", authController.refreshToken);
authRouter.post("/logout", authController.logout);
authRouter.get("/logout", authController.logout);
export default authRouter;