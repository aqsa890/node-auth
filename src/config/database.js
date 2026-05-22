import mongoose from "mongoose";
import config from "./config.js";

async function connectDB(){
    try {
        await mongoose.connect(config.MONGO_URI);
        console.log("Connected to MongoDB");
        return mongoose.connection;
    } catch (error) {
        console.error("Failed to connect to MongoDB:", error);
        throw error;
    }
}

export default connectDB;