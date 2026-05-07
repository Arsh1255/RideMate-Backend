const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGO_URI, {
  family: 4 // This forces IPv4, which is safer for mobile hotspots
});

const connectDB = async () => {
  try {
    await client.connect();
    console.log("MongoDB connected ✅");
    return client.db();
  } catch (error) {
    console.error("MongoDB connection failed ❌");
    console.error("Error Detail:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;