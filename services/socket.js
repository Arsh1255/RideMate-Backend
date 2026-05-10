const { Server } = require("socket.io");
const admin = require("../config/firebase");
const Ride = require("../models/Ride");
const User = require("../models/User");
const Message = require("../models/Message");

// Constants
const EVENTS = {
    RIDE_STARTED: 'RIDE_STARTED',
    RIDE_COMPLETED: 'RIDE_COMPLETED',
    RIDE_CANCELLED: 'RIDE_CANCELLED',
    REQUEST_CREATED: 'REQUEST_CREATED',
    REQUEST_ACCEPTED: 'REQUEST_ACCEPTED',
    REQUEST_REJECTED: 'REQUEST_REJECTED',
    PARTICIPANT_JOINED: 'PARTICIPANT_JOINED',
    PARTICIPANT_LEFT: 'PARTICIPANT_LEFT',
    PARTICIPANT_REMOVED: 'PARTICIPANT_REMOVED',
    CHAT_SEND_MESSAGE: 'CHAT:SEND_MESSAGE',
    CHAT_MESSAGE: 'CHAT:MESSAGE'
};

let io;

function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: "*",
        }
    });

    // Middleware for Auth
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error("Authentication error: No token provided"));
            }
            const decoded = await admin.auth().verifyIdToken(token);
            socket.user = decoded; // Attach user info
            next();
        } catch (err) {
            next(new Error("Authentication error: Invalid token"));
        }
    });

    io.on("connection", async (socket) => {
        console.log(`--> Socket connected: ${socket.id}, User: ${socket.user.uid}`);

        // Join personal room using Firebase UID
        socket.join(`user_${socket.user.uid}`);
        
        // Auto-join all ride rooms the user is part of
        try {
            const { getOrCreateMongoUser } = require("../utils/authHealer");
            const mongoUser = await getOrCreateMongoUser(socket.user);
            
            if (mongoUser) {
                const rides = await Ride.find({
                    $or: [
                        { creatorId: mongoUser._id },
                        { participantIds: mongoUser._id }
                    ]
                });
                rides.forEach(ride => {
                    socket.join(`ride_${ride._id}`);
                    console.log(`Auto-joined ride_${ride._id} for user ${socket.user.uid}`);
                });
            }
        } catch (err) {
            console.error("Error auto-joining ride rooms:", err);
        }

        socket.on("join_ride", async (rideId) => {
            try {
                const user = await User.findOne({ uid: socket.user.uid });
                const ride = await Ride.findById(rideId);
                
                if (!user || !ride) {
                    return console.log(`Join failed: User or Ride not found`);
                }
                
                const isCreator = ride.creatorId.toString() === user._id.toString();
                const isParticipant = ride.participantIds.some(id => id.toString() === user._id.toString());
                
                if (isCreator || isParticipant) {
                    socket.join(`ride_${rideId}`);
                    console.log(`User ${socket.user.uid} joined ride_${rideId}`);
                } else {
                    console.log(`User ${socket.user.uid} unauthorized for ride_${rideId}`);
                }
            } catch (err) {
                console.error("Error in join_ride:", err);
            }
        });

        socket.on(EVENTS.CHAT_SEND_MESSAGE, async (data) => {
            try {
                const { rideId, text } = data;
                
                if (!rideId || !text) return;
                if (text.length > 1000) return;
                
                const user = await User.findOne({ uid: socket.user.uid });
                const ride = await Ride.findById(rideId);
                
                if (!user || !ride) return;
                
                const isCreator = ride.creatorId.toString() === user._id.toString();
                const isParticipant = ride.participantIds.some(id => id.toString() === user._id.toString());
                
                if (!isCreator && !isParticipant) return;
                
                if (ride.status === 'completed' || ride.status === 'cancelled') return;
                
                const message = new Message({
                    rideId,
                    senderId: user._id,
                    text
                });
                await message.save();
                
                io.to(`ride_${rideId}`).emit(EVENTS.CHAT_MESSAGE, {
                    _id: message._id,
                    rideId,
                    text,
                    createdAt: message.createdAt,
                    sender: {
                        uid: user.uid,
                        name: user.name,
                        profilePic: user.profilePic
                    }
                });
                
                console.log(`Chat message sent in ride_${rideId} by ${socket.user.uid}`);
                
            } catch (err) {
                console.error("Error in CHAT_SEND_MESSAGE:", err);
            }
        });

        socket.on("leave_ride", (rideId) => {
            socket.leave(`ride_${rideId}`);
            console.log(`User ${socket.user.uid} left ride_${rideId}`);
        });

        socket.on("disconnect", () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });

    return io;
}

function getIO() {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
}

module.exports = { initSocket, getIO, EVENTS };
