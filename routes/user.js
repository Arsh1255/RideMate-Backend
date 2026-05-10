const express = require("express");
const router = express.Router();

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
        await admin
            .auth()
            .verifyIdToken(token);
        console.log("--> Token verified successfully.");

        // ---------------- FIND USER ----------------

        console.log("--> Searching DB for user with uid:", req.params.id);
        const user =
            await User.findOne({
                uid: req.params.id,
            });
        console.log("--> User search complete. Found:", user ? "Yes" : "No");

        if (!user) {

            return res.status(404).json({
                message: "User not found",
            });
        }

        // ---------------- RESPONSE ----------------

        return res.status(200).json({

            id:
                user._id,

            uid:
                user.uid,

            name:
                user.name,

            email:
                user.email,

            profilePic:
                user.profilePic,

            ecoScore:
                user.ecoScore,

            co2Saved:
                user.co2Saved,

            ridesTaken:
                user.ridesTaken,

            peopleSharedWith:
                user.peopleSharedWith,
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
