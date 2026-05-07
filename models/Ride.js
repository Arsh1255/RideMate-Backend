const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema({
  creatorId: { type: String, required: true },
  creatorName: String,
  creatorImage: String,
  source: { name: String, lat: Number, lng: Number },
  destination: { name: String, lat: Number, lng: Number },
  departureTime: Date,
  vehicleType: { type: String, enum: ['Bike', 'Car', 'Auto', 'Metro', 'Bus', 'Stride'] },
  mode: String, // 'has vehicle', 'carpool', etc.
  totalSeats: Number,
  availableSeats: Number, // This is what the UI shows
  pricePerPerson: { type: Number, default: 0 }, // Added: For cost splitting
  notes: String,
  status: { type: String, default: 'Created' }, // could be created,active,finished,cancelled
  participants: [{ 
    uid: String, 
    name: String, 
    image: String 
  }]
});

module.exports = mongoose.model("Ride", rideSchema);