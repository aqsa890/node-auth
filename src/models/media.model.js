import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema({
    url: {
        type: String,
        required: true,
    },
    public_id: {
        type: String,
        required: true,
    },
    ownerId: {
        type: String,
    },
    folder: {
        type: String,
    },
    fileId: {
        type: String,
    },
    mediaType: {
        type: String,
        enum: ["image", "video"],
        required: true,
    },
}, { timestamps: true });

const MediaModel = mongoose.models.Media || mongoose.model("Media", mediaSchema);

export default MediaModel;