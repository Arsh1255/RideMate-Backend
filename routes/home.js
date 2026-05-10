const express = require("express");
const router = express.Router();

const admin = require("../config/firebase");

const User = require("../models/User");
const Ride = require("../models/Ride");
const Request = require("../models/Request");

router.get("/", async (req, res) => {

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

        const decoded =
            await admin
                .auth()
                .verifyIdToken(token);

        // ---------------- FIND CURRENT USER ----------------

        const currentUser =
            await User.findOne({
                uid: decoded.uid,
            });

        if (!currentUser) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        // ---------------- USER REQUESTS ----------------

        const requests =
            await Request.find({
                userId: currentUser._id,
            });

        const requestedRideIds =
            requests.map(
                (request) => request.rideId
            );

        // ---------------- FETCH ALL RELEVANT RIDES ----------------

        const rides = await Ride.find({
            $or: [

                // Created rides
                {
                    creatorId:
                        currentUser._id,
                },

                // Joined rides
                {
                    participantIds:
                        currentUser._id,
                },

                // Requested rides
                {
                    _id: {
                        $in: requestedRideIds,
                    },
                },
            ],
        });

        // ---------------- BUILD RESPONSE ----------------

        const finalRides = [];

        for (const ride of rides) {

            // -------- RELATIONSHIP --------

            let relationship = "member";

            if (
                ride.creatorId.toString() ===
                currentUser._id.toString()
            ) {
                relationship = "owner";
            }

            // -------- MEMBERSHIP STATUS --------

            let membershipStatus = null;

            // Accepted member
            if (
                ride.participantIds.some(
                    (id) =>
                        id.toString() ===
                        currentUser._id.toString()
                )
            ) {
                membershipStatus = "accepted";
            }

            // Pending / Rejected
            else {

                const request =
                    requests.find(
                        (r) =>
                            r.rideId.toString() ===
                            ride._id.toString()
                    );

                if (request) {
                    membershipStatus =
                        request.status;
                }
            }

            // -------- PARTICIPANT USERS --------

            const participantUsers =
                await User.find({
                    _id: {
                        $in:
                            ride.participantIds,
                    },
                });

            const participants =
                participantUsers.map(
                    (user) => ({
                        id: user._id,

                        name:
                            user.name,

                        profilePic:
                            user.profilePic,
                    })
                );

            // -------- FINAL OBJECT --------

            finalRides.push({

                id:
                    ride._id,

                rideName:
                    ride.rideName,

                source:
                    ride.source,

                destination:
                    ride.destination,

                departureTime:
                    ride.departureTime,

                vehicleType:
                    ride.vehicleType,

                mode:
                    ride.mode,

                availableSeats:
                    ride.availableSeats,

                pricePerPerson:
                    ride.pricePerPerson,

                rideStatus:
                    ride.status,

                relationship,

                membershipStatus,

                participants,

                pendingRequests:
                    ride.pendingRequests,
            });
        }

        // ---------------- RESPONSE ----------------

        return res.status(200).json({
            rides: finalRides,
        });

    } catch (err) {

        console.log(err);

        return res.status(500).json({
            message:
                "Failed to fetch rides",
        });
    }
});

module.exports = router;

