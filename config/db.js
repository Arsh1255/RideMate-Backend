const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Adding family: 4 forces Node to use IPv4, which often fixes ECONNREFUSED
    // serverSelectionTimeoutMS gives it a 5-second window before failing
    await mongoose.connect(process.env.MONGO_URI, {
      family: 4, 
      serverSelectionTimeoutMS: 5000 
    });
    console.log("MongoDB connected ✅");
  } catch (error) {
    console.error("MongoDB connection failed ❌");
    console.error("Error Detail:", error.message);
    
    // Check if the URI is actually being loaded
    if (!process.env.MONGO_URI) {
      console.error("FATAL: MONGO_URI is undefined. Check your .env file.");
    }
    
    process.exit(1); 
  }
};

module.exports = connectDB;