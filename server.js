require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db"); 

const authRoutes = require("./routes/auth");
const homeRoutes = require("./routes/home");
const userRoutes = require("./routes/user.js");
const rideRoutes = require("./routes/rides");
const { startCleanupJob } = require("./services/cleanup");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/home", homeRoutes);
app.use("/api/user",userRoutes);
app.use("/api/rides", rideRoutes);

// Initialize Database Connection
connectDB();
startCleanupJob();

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
  res.send("Backend running 🚀");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});