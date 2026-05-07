const express = require("express");
const router = express.Router();
const admin = require("../config/firebase");
const User = require("../models/User");

router.post("/verify", async (req, res) => {
    try {
        const { idToken, profilePic } = req.body;

        if (!idToken) {
            return res.status(400).json({ message: "No token provided" });
        }

        // 🔐 Verify Firebase token
        const decoded = await admin.auth().verifyIdToken(idToken);
        const {
            uid,
            email,
            email_verified,
            name: firebaseName
        } = decoded;

        // ❌ 1. Domain check[cite: 9]
        if (!email.endsWith("@bmsce.ac.in")) {
            console.log("\nUSER IS NOT BMSCE SO REMOVING HIM\n");
            await admin.auth().deleteUser(uid);
            return res.status(403).json({ message: "Only BMSCE emails allowed" });
        }

        // ❌ 2. Email verification check[cite: 9]
        if (!email_verified) {
            return res.status(403).json({ message: "Email not verified" });
        }

        // ✅ 3. Handle User in MongoDB[cite: 9]
        let foundUser = await User.findOne({ uid });

        if (!foundUser) {
            // New user registration with initial eco-stats
            foundUser = await User.create({
                uid,
                email,
                name: firebaseName || "New User",
                profilePic: profilePic || "music.png",
                ecoScore: 0,
                co2Saved: 0,
                ridesTaken: 0,
                peopleSharedWith: 0
            });

            return res.status(201).json({
                message: "Signup successful",
                user: foundUser,
            });
        }

        // Existing user login
        return res.status(200).json({
            message: "Login successful",
            user: foundUser,
        });

    } catch (err) {
        console.error("Auth Handshake Error:", err.message);
        return res.status(401).json({ message: "Invalid or expired token" });
    }
});

module.exports = router;