import app from "./src/app.js";
import connectDB from "./src/config/database.js";

connectDB();
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});



