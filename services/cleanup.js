const Ride = require("../models/Ride");
const Request = require("../models/Request");

function startCleanupJob() {
    console.log("--> Starting expired ride cleanup job (every 15 mins)");
    
    setInterval(async () => {
        console.log("--> Running cleanup job...");
        try {
            const now = new Date();
            
            // STEP 1: Find expired rides
            const expiredRides = await Ride.find({ expirationTime: { $lte: now } });
            
            if (expiredRides.length === 0) {
                console.log("--> No expired rides found.");
                return;
            }
            
            console.log(`--> Found ${expiredRides.length} expired rides.`);
            
            const rideIds = expiredRides.map(r => r._id);
            
            // STEP 2: Delete related requests
            const reqResult = await Request.deleteMany({ rideId: { $in: rideIds } });
            console.log(`--> Deleted ${reqResult.deletedCount} orphaned requests.`);
            
            // STEP 3: Delete expired rides
            const rideResult = await Ride.deleteMany({ _id: { $in: rideIds } });
            console.log(`--> Deleted ${rideResult.deletedCount} expired rides.`);
            
        } catch (err) {
            console.error("Error in cleanup job:", err);
        }
    }, 15 * 60 * 1000); // 15 minutes
}

module.exports = { startCleanupJob };
