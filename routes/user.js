const express = require("express");
const router = express.Router();

const { getOrCreateMongoUser } = require("../utils/authHealer");
const admin = require("../config/firebase");

const User = require("../models/User");

router.get("/:id", async (req, res) => {
    console.log("--> GET /api/user/:id called with ID:", req.params.id);
    try {

        // ---------------- TOKEN ----------------

        const authHeader =
            req.headers.authorization;

        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {

            return res.status(401).json({
                message: "No token provided",
            });
        }

        const token =
            authHeader.split("Bearer ")[1];

        console.log("--> Verifying Firebase token...");
        const decoded = await admin
            .auth()
            .verifyIdToken(token);
        console.log("--> Token verified successfully.");

        // ---------------- FIND USER ----------------

        console.log("--> Searching DB for user with uid:", req.params.id);
        
        // Use authHealer to ensure user exists
        const user = await getOrCreateMongoUser(decoded);
        console.log("--> User search/heal complete.");

        // We check against req.params.id if it's different from current user
        let targetUser = user;
        if (req.params.id !== decoded.uid) {
            targetUser = await User.findOne({ uid: req.params.id });
            if (!targetUser) {
                return res.status(404).json({ message: "User not found" });
            }
        }

        // ---------------- RESPONSE ----------------

        return res.status(200).json({
            id: targetUser._id,
            uid: targetUser.uid,
            name: targetUser.name,
            email: targetUser.email,
            profilePic: targetUser.profilePic,
            ecoScore: targetUser.ecoScore,
            co2Saved: targetUser.co2Saved,
            ridesTaken: targetUser.ridesTaken,
            peopleSharedWith: targetUser.peopleSharedWith,
        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            message:
                "Failed to fetch profile",
        });
    }
});

module.exports = router;
