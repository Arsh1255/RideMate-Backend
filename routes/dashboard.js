const express = require("express");
const router = express.Router();
const admin = require("../config/firebase");
const User = require("../models/User");

router.get("/", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }
        const token = authHeader.split("Bearer ")[1];
        await admin.auth().verifyIdToken(token); // Ensure valid user session

        // 1. Aggregation for Total CO2 Saved (null/undefined safety via $ifNull)
        const co2Aggregation = await User.aggregate([
            {
                $group: {
                    _id: null,
                    totalCo2Saved: { $sum: { $ifNull: ["$co2Saved", 0] } }
                }
            }
        ]);
        const totalCo2Saved = co2Aggregation.length > 0 ? co2Aggregation[0].totalCo2Saved : 0;

        // 2. Leaderboard Query (Top 10 users ranked by ecoScore)
        const leaderboard = await User.find({ ecoScore: { $exists: true, $ne: null } })
            .sort({ ecoScore: -1 })
            .limit(10)
            .select("name profilePic ecoScore -_id");

        return res.status(200).json({
            totalCo2Saved,
            leaderboard
        });

    } catch (err) {
        console.error("Error fetching dashboard data:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;
