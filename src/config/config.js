import dotenv from "dotenv";

dotenv.config();

const requiredEnvVars = ["MONGO_URI", "JWT_SECRET"];
const missingEnvVars = requiredEnvVars.filter((name) => !process.env[name]);

if (missingEnvVars.length > 0) {
    console.error(`Missing required environment variable(s): ${missingEnvVars.join(", ")}`);
    console.error(
        "Provide them via environment variables (recommended for Docker/production) or via a local .env file for development."
    );
    console.error(
        "Docker example: docker run --env-file .env -p 3000:3000 <image-name>"
    );
    process.exit(1);
}


const config = {
    MONGO_URI: process.env.MONGO_URI ,
    JWT_SECRET: process.env.JWT_SECRET
};

export default config;