const mongoose = require("mongoose");

const rideSchema = new mongoose.Schema({
  rideName: {
    type: String,
    required: true
  },
  creatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  source: { name: String, lat: Number, lng: Number },
  destination: { name: String, lat: Number, lng: Number },
  departureTime: Date,
  expirationTime: { type: Date, index: true },
  vehicleType: { type: String, enum: ['bike', 'car', 'bmtcBus', 'metro', 'none'] },
  mode: {
    type: String,
    enum: [
      'publicTransportation',
      'hasVehicle',
      'stride'
    ]
  },
  totalSeats: Number,
  availableSeats: Number, // This is what the UI shows
  pricePerPerson: { type: Number, default: 0 }, // Added: For cost splitting
  notes: String,
  status: {
    type: String,
    enum: [
      'created',
      'started',
      'completed',
      'cancelled'
    ],
    default: 'created'
  },
  participantIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],
  pendingRequests: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Request"
    }
  ],
});

module.exports = mongoose.model("Ride", rideSchema);