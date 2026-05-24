import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";

import app from "../src/app.js";
import connectDB from "../src/config/database.js";
import MediaModel from "../src/models/media.model.js";
import UserModel from "../src/models/user.model.js";

const makeRegisterPayload = (suffix = Date.now()) => ({
	username: `media_user_${suffix}`,
	email: `media_user_${suffix}@example.com`,
	password: "password123",
});

async function registerAndGetToken() {
	const payload = makeRegisterPayload();
	const res = await request(app).post("/api/auth/register").send(payload);
	assert.equal(res.status, 201);
	assert.ok(res.body.token);
	assert.ok(res.body.user?.id);
	return { token: res.body.token, userId: res.body.user.id.toString() };
}

test("Media: upload -> get -> replace -> delete", async () => {
	await connectDB();
	await MediaModel.deleteMany({});
	await UserModel.deleteMany({});

	const { token, userId } = await registerAndGetToken();

	const uploadRes = await request(app)
		.post("/api/media")
		.set("Authorization", `Bearer ${token}`)
		.attach("file", Buffer.from("dummy"), "test.jpg");

	assert.equal(uploadRes.status, 201);
	assert.ok(uploadRes.body._id);
	assert.ok(uploadRes.body.public_id);
	assert.equal(uploadRes.body.ownerId, userId);
	assert.ok(uploadRes.body.public_id.startsWith(`Home/Gallery/${userId}/`));
	assert.ok(uploadRes.body.fileId);

	const id = uploadRes.body._id;
	const initialFileId = uploadRes.body.fileId;

	const listRes = await request(app).get("/api/media");
	assert.equal(listRes.status, 200);
	assert.ok(Array.isArray(listRes.body));
	assert.equal(listRes.body.length, 1);

	const getRes = await request(app).get(`/api/media/${id}`);
	assert.equal(getRes.status, 200);
	assert.equal(getRes.body._id, id);

	const replaceRes = await request(app)
		.put(`/api/media/${id}`)
		.set("Authorization", `Bearer ${token}`)
		.attach("file", Buffer.from("dummy2"), "test2.jpg");

	assert.equal(replaceRes.status, 200);
	assert.equal(replaceRes.body._id, id);
	assert.equal(replaceRes.body.fileId, initialFileId, "replace should keep same fileId");
	assert.ok(replaceRes.body.public_id.startsWith(`Home/Gallery/${userId}/`));

	const deleteRes = await request(app).delete(`/api/media/${id}`);
	assert.equal(deleteRes.status, 200);
	assert.equal(deleteRes.body.message, "Media deleted successfully");

	const after = await MediaModel.find({});
	assert.equal(after.length, 0);

	await mongoose.disconnect();
});

test("Media: delete-all deletes only current user's media", async () => {
	await connectDB();
	await MediaModel.deleteMany({});
	await UserModel.deleteMany({});

	const userA = await registerAndGetToken();
	const userB = await registerAndGetToken();

	await request(app)
		.post("/api/media")
		.set("Authorization", `Bearer ${userA.token}`)
		.attach("file", Buffer.from("a1"), "a1.jpg");
	await request(app)
		.post("/api/media")
		.set("Authorization", `Bearer ${userA.token}`)
		.attach("file", Buffer.from("a2"), "a2.jpg");
	await request(app)
		.post("/api/media")
		.set("Authorization", `Bearer ${userB.token}`)
		.attach("file", Buffer.from("b1"), "b1.jpg");

	const beforeA = await MediaModel.countDocuments({ ownerId: userA.userId });
	const beforeB = await MediaModel.countDocuments({ ownerId: userB.userId });
	assert.equal(beforeA, 2);
	assert.equal(beforeB, 1);

	const delAllRes = await request(app)
		.delete("/api/media/deleteAll")
		.set("Authorization", `Bearer ${userA.token}`);

	assert.equal(delAllRes.status, 200);
	assert.equal(delAllRes.body.message, "All media deleted successfully");
	assert.equal(delAllRes.body.deleted, 2);

	const afterA = await MediaModel.countDocuments({ ownerId: userA.userId });
	const afterB = await MediaModel.countDocuments({ ownerId: userB.userId });
	assert.equal(afterA, 0);
	assert.equal(afterB, 1);

	await mongoose.disconnect();
});
