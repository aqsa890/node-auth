import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";

import app from "../src/app.js";
import connectDB from "../src/config/database.js";
import UserModel from "../src/models/user.model.js";

const makeRegisterPayload = (suffix = Date.now()) => ({
	username: `user_${suffix}`,
	email: `user_${suffix}@example.com`,
	password: "password123"
});

test("CI sanity: server can listen", async () => {
	const server = app.listen(0);
	await new Promise((resolve) => server.close(resolve));
});

test("DB: connects successfully", async () => {
	const conn = await connectDB();
	assert.equal(conn.readyState, 1);
	await mongoose.disconnect();
});

test("Auth: register returns access token and sets refresh cookie", async () => {
	await connectDB();
	await UserModel.deleteMany({});

	const res = await request(app)
		.post("/api/auth/register")
		.send(makeRegisterPayload());

	assert.equal(res.status, 201);
	assert.ok(res.body.token, "token should be present");
	assert.ok(res.body.user?.id, "user.id should be present");

	const setCookie = res.headers["set-cookie"];
	assert.ok(Array.isArray(setCookie) && setCookie.length > 0, "refreshToken cookie should be set");
	assert.ok(setCookie.some((c) => c.startsWith("refreshToken=")), "refreshToken cookie should be in Set-Cookie");

	await mongoose.disconnect();
});

test("Auth: get-me verifies and decodes access token", async () => {
	await connectDB();
	await UserModel.deleteMany({});

	const registerRes = await request(app)
		.post("/api/auth/register")
		.send(makeRegisterPayload());

	const token = registerRes.body.token;
	assert.ok(token);

	const meRes = await request(app)
		.get("/api/auth/get-me")
		.set("Authorization", `Bearer ${token}`);

	assert.equal(meRes.status, 200);
	assert.ok(meRes.body.decoded?.id, "decoded.id should be present");
	assert.ok(meRes.body.decoded?.iat, "decoded.iat should be present");
	assert.ok(meRes.body.decoded?.exp, "decoded.exp should be present");

	await mongoose.disconnect();
});

test("Auth: refresh-token issues new access token when cookie is present", async () => {
	await connectDB();
	await UserModel.deleteMany({});

	const agent = request.agent(app);

	const registerRes = await agent
		.post("/api/auth/register")
		.send(makeRegisterPayload());

	assert.equal(registerRes.status, 201);

	const refreshRes = await agent
		.post("/api/auth/refresh-token")
		.send({});

	assert.equal(refreshRes.status, 200);
	assert.ok(refreshRes.body.token, "new access token should be returned");

	await mongoose.disconnect();
});
