const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
  // The ride being joined
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    required: true
  },
  // The student asking for the ride
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Coordinates from your Flutter Map Picker
  pickupLocation: {
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  // Number of seats the student is booking
  seatsRequested: {
    type: Number,
    default: 1,
    min: 1
  },
  // The lifecycle of a ride request
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Request', RequestSchema);