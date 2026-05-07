const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
  },
  profilePic: 
  {
    type: String, 
    default: null
  },
  name: {
    type: String,
    required: true,
  },
  ecoScore: {
    type: Number,
    default: 0, // Starts at 0, increases per ride
  },
  co2Saved: {
    type: Number,
    default: 0, // Tracked in kg or grams
  },
  ridesTaken: {
    type: Number,
    default: 0,
  },
  peopleSharedWith: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);