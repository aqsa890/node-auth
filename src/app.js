import express from 'express';
import morgan from 'morgan';
import authRouter from './routes/auth.routes.js';
import mediaRouter from './routes/media.routes.js';
import cookieParser from 'cookie-parser';

const app= express();

app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());

app.use("/api/auth", authRouter);
app.use("/api/media", mediaRouter);
// Backward-compatible alias (some clients expect media under /api/auth)
app.use("/api/auth/media", mediaRouter);

export default app;