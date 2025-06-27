require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const userRoute = require("./routers/user_route");

const app = express();
app.use(express.json());

mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch(err => console.error("❌ MongoDB connection error:", err));

app.use("/user", userRoute);

app.use((req, res) => {
    res.status(404).json({ message: "No Route Found" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
