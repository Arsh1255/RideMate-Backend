const express = require("express");
const router = express.Router();
const admin = require("../config/firebase");
const Ride = require("../models/Ride");
const User = require("../models/User");
const Request = require("../models/Request");

// Helper for distance calculation (Haversine formula)
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
}

router.post("/create", async (req, res) => {
    console.log("--> POST /api/rides/create called");
    try {
        // 1. VERIFY FIREBASE TOKEN
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }
        const token = authHeader.split("Bearer ")[1];
        const decoded = await admin.auth().verifyIdToken(token);
        console.log("--> Token verified for UID:", decoded.uid);

        // 2. FIND CURRENT USER
        const currentUser = await User.findOne({ uid: decoded.uid });
        if (!currentUser) {
            return res.status(404).json({ message: "User not found in database" });
        }

        const payload = req.body;

        // 4. VALIDATE ON BACKEND
        const { rideName, totalSeats, source, destination, departureTime, mode, vehicleType } = payload;

        if (!rideName || rideName.trim().length < 3) {
            return res.status(400).json({ message: "Ride name must be at least 3 characters long" });
        }

        if (!source || !destination || !source.lat || !source.lng || !destination.lat || !destination.lng) {
            return res.status(400).json({ message: "Valid source and destination are required" });
        }

        const distance = getDistance(source.lat, source.lng, destination.lat, destination.lng);
        if (distance < 100) {
            return res.status(400).json({ message: "Pickup and drop locations must be at least 100 meters apart" });
        }

        const depTime = new Date(departureTime);
        if (depTime < new Date()) {
            return res.status(400).json({ message: "Departure time cannot be in the past" });
        }

        const validModes = ['publicTransportation', 'hasVehicle', 'stride'];
        if (!validModes.includes(mode)) {
            return res.status(400).json({ message: "Invalid ride mode" });
        }

        const validVehicles = ['bike', 'car', 'bmtcBus', 'metro', 'none'];
        if (!validVehicles.includes(vehicleType)) {
            return res.status(400).json({ message: "Invalid vehicle type" });
        }

        if (!totalSeats || totalSeats < 1) {
            return res.status(400).json({ message: "Total seats must be at least 1" });
        }

        // 3. CREATE RIDE DOCUMENT
        const newRide = new Ride({
            rideName,
            creatorId: currentUser._id, // MongoDB _id
            source,
            destination,
            departureTime: depTime,
            expirationTime: new Date(depTime.getTime() + 6 * 60 * 60 * 1000),
            vehicleType,
            mode,
            totalSeats,
            availableSeats: totalSeats - 1, // Rule 6
            pricePerPerson: payload.pricePerPerson || 0,
            notes: payload.notes,
            status: "created", // Rule 1
            participantIds: [currentUser._id], // Rule 2
            pendingRequests: []
        });

        // 5. SAVE RIDE
        const savedRide = await newRide.save();
        console.log("--> Ride created successfully:", savedRide._id);

        // 6. RESPONSE
        return res.status(201).json({
            message: "Ride created successfully",
            ride: savedRide
        });

    } catch (err) {
        console.error("Error creating ride:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

router.post("/search", async (req, res) => {
    console.log("--> POST /api/rides/search called");
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }
        const token = authHeader.split("Bearer ")[1];
        const decoded = await admin.auth().verifyIdToken(token);

        const currentUser = await User.findOne({ uid: decoded.uid });
        if (!currentUser) {
            return res.status(404).json({ message: "User not found in database" });
        }

        const { source, destination, date, time, flexibleTime, seatsNeeded, mode, matchAccuracy } = req.body;

        let radius = 800; // Default moderate
        if (matchAccuracy === 'Exact Match') radius = 300;
        if (matchAccuracy === 'Lenient Match') radius = 2000;

        const depDate = new Date(date);
        const startOfDay = new Date(depDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(depDate.setHours(23, 59, 59, 999));

        const myRequests = await Request.find({ requesterId: currentUser._id });
        const requestedRideIds = myRequests.map(r => r.rideId);

        const query = {
            _id: { $nin: requestedRideIds },
            status: "created",
            availableSeats: { $gte: seatsNeeded || 1 },
            mode: mode,
            participantIds: { $ne: currentUser._id },
            creatorId: { $ne: currentUser._id },
            departureTime: { $gte: startOfDay, $lte: endOfDay }
        };

        const rides = await Ride.find(query).populate('creatorId');

        const matchedRides = rides.filter(ride => {
            const distSource = getDistance(source.lat, source.lng, ride.source.lat, ride.source.lng);
            const distDest = getDistance(destination.lat, destination.lng, ride.destination.lat, ride.destination.lng);

            const sourceMatches = distSource <= radius;
            const destMatches = distDest <= radius;

            let timeMatches = true;
            if (!flexibleTime && time) {
                const reqTime = new Date(date); // Assuming date has time or we merge it
                const rideTime = new Date(ride.departureTime);
                const diffMs = Math.abs(reqTime - rideTime);
                timeMatches = diffMs <= 60 * 60 * 1000; // 1 hour
            }

            return sourceMatches && destMatches && timeMatches;
        });

        console.log(`--> Found ${matchedRides.length} matching rides`);
        return res.status(200).json({ rides: matchedRides });

    } catch (err) {
        console.error("Error searching rides:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});
router.get("/:id", async (req, res) => {
    console.log(`--> GET /api/rides/${req.params.id} called`);
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }
        const token = authHeader.split("Bearer ")[1];
        await admin.auth().verifyIdToken(token);

        const ride = await Ride.findById(req.params.id)
            .populate('creatorId', 'name profilePic uid')
            .populate('participantIds', 'name profilePic uid')
            .populate({
                path: 'pendingRequests',
                populate: { path: 'userId', select: 'name profilePic uid' }
            });

        if (!ride) {
            return res.status(404).json({ message: "Ride not found" });
        }

        return res.status(200).json({ ride });

    } catch (err) {
        console.error("Error fetching ride:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});


router.post("/requests/create", async (req, res) => {
    console.log("--> POST /api/rides/requests/create called");
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }
        const token = authHeader.split("Bearer ")[1];
        const decoded = await admin.auth().verifyIdToken(token);

        const currentUser = await User.findOne({ uid: decoded.uid });
        if (!currentUser) {
            return res.status(404).json({ message: "User not found in database" });
        }

        const { rideId, seatsRequested, pickupLocation } = req.body;

        const ride = await Ride.findById(rideId);
        if (!ride) {
            return res.status(404).json({ message: "Ride not found" });
        }

        if (ride.status !== 'created') {
            return res.status(400).json({ message: "Requests cannot be created for this ride anymore" });
        }

        const existingRequest = await Request.findOne({ rideId, userId: currentUser._id, status: 'pending' });
        if (existingRequest) {
            return res.status(400).json({ message: "You already have a pending request for this ride" });
        }

        if (ride.participantIds.includes(currentUser._id)) {
            return res.status(400).json({ message: "You are already a participant in this ride" });
        }

        const newRequest = new Request({
            rideId,
            userId: currentUser._id,
            seatsRequested: seatsRequested || 1,
            pickupLocation,
            status: 'pending'
        });

        const savedRequest = await newRequest.save();

        ride.pendingRequests.push(savedRequest._id);
        await ride.save();

        return res.status(201).json({ message: "Request created successfully", request: savedRequest });

    } catch (err) {
        console.error("Error creating request:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

router.post("/requests/:id/accept", async (req, res) => {
    console.log(`--> POST /api/rides/requests/${req.params.id}/accept called`);
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }
        const token = authHeader.split("Bearer ")[1];
        const decoded = await admin.auth().verifyIdToken(token);

        const currentUser = await User.findOne({ uid: decoded.uid });
        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const request = await Request.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ message: "Request is already processed" });
        }

        const ride = await Ride.findById(request.rideId);
        if (!ride) {
            return res.status(404).json({ message: "Ride not found" });
        }

        if (ride.status !== 'created') {
            return res.status(400).json({ message: "Requests cannot be accepted for this ride anymore" });
        }

        if (ride.creatorId.toString() !== currentUser._id.toString()) {
            return res.status(403).json({ message: "Only the ride creator can accept requests" });
        }

        if (ride.availableSeats < request.seatsRequested) {
            return res.status(400).json({ message: "Not enough available seats" });
        }

        // Atomic update
        request.status = 'accepted';
        await request.save();

        ride.pendingRequests = ride.pendingRequests.filter(id => id.toString() !== request._id.toString());
        ride.participantIds.push(request.userId);
        ride.availableSeats -= request.seatsRequested;
        await ride.save();

        return res.status(200).json({ message: "Request accepted successfully", ride });

    } catch (err) {
        console.error("Error accepting request:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

router.post("/requests/:id/reject", async (req, res) => {
    console.log(`--> POST /api/rides/requests/${req.params.id}/reject called`);
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }
        const token = authHeader.split("Bearer ")[1];
        const decoded = await admin.auth().verifyIdToken(token);

        const currentUser = await User.findOne({ uid: decoded.uid });
        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const request = await Request.findById(req.params.id);
        if (!request) {
            return res.status(404).json({ message: "Request not found" });
        }

        if (request.status !== 'pending') {
            return res.status(400).json({ message: "Request is already processed" });
        }

        const ride = await Ride.findById(request.rideId);
        if (!ride) {
            return res.status(404).json({ message: "Ride not found" });
        }

        if (ride.status !== 'created') {
            return res.status(400).json({ message: "Requests cannot be rejected for this ride anymore" });
        }

        if (ride.creatorId.toString() !== currentUser._id.toString()) {
            return res.status(403).json({ message: "Only the ride creator can reject requests" });
        }

        // Update status
        request.status = 'rejected';
        await request.save();

        ride.pendingRequests = ride.pendingRequests.filter(id => id.toString() !== request._id.toString());
        await ride.save();

        return res.status(200).json({ message: "Request rejected successfully", ride });

    } catch (err) {
        console.error("Error rejecting request:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});


router.post("/:id/start", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }
        const token = authHeader.split("Bearer ")[1];
        const decoded = await admin.auth().verifyIdToken(token);
        const currentUser = await User.findOne({ uid: decoded.uid });

        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const ride = await Ride.findById(req.params.id);
        if (!ride) {
            return res.status(404).json({ message: "Ride not found" });
        }

        if (ride.creatorId.toString() !== currentUser._id.toString()) {
            return res.status(403).json({ message: "Only the ride creator can start the ride" });
        }

        if (ride.status !== 'created') {
            return res.status(400).json({ message: "Ride cannot be started from this state" });
        }

        // Delete unresolved pending requests
        await Request.deleteMany({ rideId: ride._id, status: 'pending' });

        // Clear pending requests array
        ride.pendingRequests = [];

        ride.status = 'started';
        await ride.save();

        return res.status(200).json({ message: "Ride started successfully", ride });

    } catch (err) {
        console.error("Error starting ride:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

router.post("/:id/complete", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }
        const token = authHeader.split("Bearer ")[1];
        const decoded = await admin.auth().verifyIdToken(token);
        const currentUser = await User.findOne({ uid: decoded.uid });

        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const ride = await Ride.findById(req.params.id);
        if (!ride) {
            return res.status(404).json({ message: "Ride not found" });
        }

        if (ride.creatorId.toString() !== currentUser._id.toString()) {
            return res.status(403).json({ message: "Only the ride creator can complete the ride" });
        }

        if (ride.status !== 'started') {
            return res.status(400).json({ message: "Only started rides can be completed" });
        }

        // Fetch all participants
        const participants = await User.find({ _id: { $in: ride.participantIds } });
        
        // Include creator in updates
        const usersToUpdate = [...participants];
        if (!usersToUpdate.some(u => u._id.toString() === currentUser._id.toString())) {
            usersToUpdate.push(currentUser);
        }

        // Distance
        const distanceMeters = getDistance(ride.source.lat, ride.source.lng, ride.destination.lat, ride.destination.lng);
        const distanceKm = distanceMeters / 1000;

        // Calculations
        let emissionFactor = 0.2; // kg CO2 per km (average car)
        let sharingMultiplier = Math.max(usersToUpdate.length - 1, 1);

        if (ride.mode === 'stride') {
            emissionFactor = 0.5; // High reward for walking
            sharingMultiplier = 1;
        } else if (ride.mode === 'publicTransportation') {
            emissionFactor = 0.1;
        } else if (ride.mode === 'hasVehicle') {
            emissionFactor = ride.vehicleType === 'bike' ? 0.05 : 0.2;
        }

        const co2Saved = distanceKm * emissionFactor * sharingMultiplier;
        const ecoScoreGained = co2Saved * 10;

        // Update metrics for all participants
        for (const user of usersToUpdate) {
            user.ecoScore = (user.ecoScore || 0) + ecoScoreGained;
            user.co2Saved = (user.co2Saved || 0) + co2Saved;
            user.ridesTaken = (user.ridesTaken || 0) + 1;
            user.peopleSharedWith = (user.peopleSharedWith || 0) + (usersToUpdate.length - 1);
            await user.save();
        }

        ride.status = 'completed';
        await ride.save();

        return res.status(200).json({ message: "Ride completed successfully", ride });

    } catch (err) {
        console.error("Error completing ride:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

router.post("/:id/cancel", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }
        const token = authHeader.split("Bearer ")[1];
        const decoded = await admin.auth().verifyIdToken(token);
        const currentUser = await User.findOne({ uid: decoded.uid });

        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const ride = await Ride.findById(req.params.id);
        if (!ride) {
            return res.status(404).json({ message: "Ride not found" });
        }

        if (ride.creatorId.toString() !== currentUser._id.toString()) {
            return res.status(403).json({ message: "Only the ride creator can cancel the ride" });
        }

        ride.status = 'cancelled';
        await ride.save();

        return res.status(200).json({ message: "Ride cancelled successfully", ride });

    } catch (err) {
        console.error("Error cancelling ride:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

router.post("/:id/leave", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }
        const token = authHeader.split("Bearer ")[1];
        const decoded = await admin.auth().verifyIdToken(token);
        const currentUser = await User.findOne({ uid: decoded.uid });

        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const ride = await Ride.findById(req.params.id);
        if (!ride) {
            return res.status(404).json({ message: "Ride not found" });
        }

        const isParticipant = ride.participantIds.some(id => id.toString() === currentUser._id.toString());
        if (!isParticipant) {
            return res.status(400).json({ message: "You are not a participant in this ride" });
        }

        ride.participantIds = ride.participantIds.filter(id => id.toString() !== currentUser._id.toString());
        ride.availableSeats += 1;
        await ride.save();

        await Request.deleteOne({ rideId: ride._id, userId: currentUser._id });

        return res.status(200).json({ message: "You have left the ride", ride });

    } catch (err) {
        console.error("Error leaving ride:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

router.post("/:id/remove-participant", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }
        const token = authHeader.split("Bearer ")[1];
        const decoded = await admin.auth().verifyIdToken(token);
        const currentUser = await User.findOne({ uid: decoded.uid });

        if (!currentUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const ride = await Ride.findById(req.params.id);
        if (!ride) {
            return res.status(404).json({ message: "Ride not found" });
        }

        if (ride.creatorId.toString() !== currentUser._id.toString()) {
            return res.status(403).json({ message: "Only the ride creator can remove participants" });
        }

        const { participantId } = req.body;
        if (!participantId) {
            return res.status(400).json({ message: "Participant ID required" });
        }

        const isParticipant = ride.participantIds.some(id => id.toString() === participantId);
        if (!isParticipant) {
            return res.status(400).json({ message: "User is not a participant in this ride" });
        }

        ride.participantIds = ride.participantIds.filter(id => id.toString() !== participantId);
        ride.availableSeats += 1;
        await ride.save();

        await Request.updateOne({ rideId: ride._id, userId: participantId }, { status: 'rejected' });

        return res.status(200).json({ message: "Participant removed", ride });

    } catch (err) {
        console.error("Error removing participant:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;
