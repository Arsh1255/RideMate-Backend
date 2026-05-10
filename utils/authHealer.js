const User = require("../models/User");

/**
 * Ensures a MongoDB User document exists for a verified Firebase token.
 * Provides self-healing synchronization for missing users.
 * 
 * @param {Object} decodedToken - The verified Firebase token payload
 * @returns {Object} The found or newly created MongoDB User document
 */
async function getOrCreateMongoUser(decodedToken) {
    let user = await User.findOne({ uid: decodedToken.uid });

    if (!user) {
        console.log(`[AUTH-HEAL] Recovered missing MongoDB user for UID: ${decodedToken.uid}`);
        
        // Utilize schema defaults for ecoScore, co2Saved, etc.
        user = await User.create({
            uid: decodedToken.uid,
            email: decodedToken.email || "unknown@bmsce.ac.in",
            name: decodedToken.name || "Recovered User",
            profilePic: decodedToken.picture || "music.png"
        });
    }

    return user;
}

module.exports = { getOrCreateMongoUser };
